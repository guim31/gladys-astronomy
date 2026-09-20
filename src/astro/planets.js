// -----------------------------------------------------------------------------
// Naked-eye planets: what is up tonight, and the next notable event.
// -----------------------------------------------------------------------------

import {
  Astronomy,
  Body,
  NAKED_EYE_PLANETS,
  toTime,
  toDate,
  position,
  sampleTimes,
  round,
} from './observer.js';

/** Planets too close to the Sun are lost in its glare, whatever their altitude. */
const MIN_ANGLE_FROM_SUN = 10;

/**
 * Planets above `minAltitude` at some point of `window` (typically the civil
 * night). Sorted brightest first.
 * @returns {Array<{ body: string, from: Date, to: Date, maxAltitude: number, maxAt: Date,
 *   magnitude: number, constellation: string, angleFromSun: number }>}
 */
export function planetsInWindow(window, observer, { minAltitude = 5, stepMinutes = 10 } = {}) {
  const result = [];
  const middle = new Date((window.start.getTime() + window.end.getTime()) / 2);
  for (const body of NAKED_EYE_PLANETS) {
    const angleFromSun = Astronomy.AngleFromSun(body, toTime(middle));
    if (angleFromSun < MIN_ANGLE_FROM_SUN) {
      continue;
    }
    let from = null;
    let to = null;
    let maxAltitude = -90;
    let maxAt = null;
    for (const t of sampleTimes(window.start, window.end, stepMinutes)) {
      const { altitude } = position(body, t, observer);
      if (altitude > maxAltitude) {
        maxAltitude = altitude;
        maxAt = t;
      }
      if (altitude >= minAltitude) {
        from = from ?? t;
        to = t;
      }
    }
    if (!from) {
      continue;
    }
    const eq = Astronomy.Equator(body, toTime(maxAt), observer, true, true);
    result.push({
      body: body.toLowerCase(),
      from,
      to,
      maxAltitude: round(maxAltitude, 0),
      maxAt,
      magnitude: round(Astronomy.Illumination(body, toTime(maxAt)).mag, 1),
      constellation: Astronomy.Constellation(eq.ra, eq.dec).name,
      angleFromSun: round(angleFromSun, 0),
    });
  }
  return result.sort((a, b) => a.magnitude - b.magnitude);
}

/**
 * Upcoming oppositions (outer planets) and greatest elongations (inner
 * planets), chronological.
 * @returns {Array<{ kind: 'opposition'|'elongation', body: string, time: Date,
 *   visibility?: 'morning'|'evening', elongation?: number }>}
 */
export function upcomingPlanetEvents(now) {
  const events = [];
  for (const body of [Body.Mars, Body.Jupiter, Body.Saturn]) {
    const time = Astronomy.SearchRelativeLongitude(body, 0, toTime(now));
    events.push({ kind: 'opposition', body: body.toLowerCase(), time: toDate(time) });
  }
  for (const body of [Body.Mercury, Body.Venus]) {
    const e = Astronomy.SearchMaxElongation(body, toTime(now));
    events.push({
      kind: 'elongation',
      body: body.toLowerCase(),
      time: toDate(e.time),
      visibility: e.visibility,
      elongation: round(e.elongation, 0),
    });
  }
  return events.sort((a, b) => a.time - b.time);
}
