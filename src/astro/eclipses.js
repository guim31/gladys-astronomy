// -----------------------------------------------------------------------------
// Eclipses and transits, as seen from the house.
// -----------------------------------------------------------------------------

import { Astronomy, Body, toTime, toDate, altitude, sampleTimes } from './observer.js';

const MAX_ITERATIONS = 40;

/**
 * Next solar eclipse with the Sun above the horizon at maximum, from the
 * observer's location.
 * @returns {{ kind: 'partial'|'annular'|'total', obscuration: number, partialBegin: Date,
 *   totalBegin: Date|null, peak: Date, totalEnd: Date|null, partialEnd: Date,
 *   peakAltitude: number }}
 */
export function nextSolarEclipse(now, observer) {
  let eclipse = Astronomy.SearchLocalSolarEclipse(toTime(now), observer);
  for (let i = 0; i < MAX_ITERATIONS && eclipse.peak.altitude <= 0; i += 1) {
    eclipse = Astronomy.NextLocalSolarEclipse(eclipse.peak.time, observer);
  }
  return {
    kind: eclipse.kind,
    obscuration: eclipse.obscuration,
    partialBegin: toDate(eclipse.partial_begin.time),
    totalBegin: eclipse.total_begin ? toDate(eclipse.total_begin.time) : null,
    peak: toDate(eclipse.peak.time),
    totalEnd: eclipse.total_end ? toDate(eclipse.total_end.time) : null,
    partialEnd: toDate(eclipse.partial_end.time),
    peakAltitude: eclipse.peak.altitude,
  };
}

/**
 * Half-duration (minutes) of the umbral phase of a lunar eclipse, or of the
 * penumbral phase for a penumbral-only eclipse.
 */
function halfDuration(eclipse) {
  return eclipse.kind === 'penumbral' ? eclipse.sd_penum : eclipse.sd_partial;
}

/**
 * Next lunar eclipse with the Moon above the horizon at some point of its
 * umbral phase. Penumbral eclipses are skipped by default: they are nearly
 * invisible to the eye.
 * @returns {{ kind: 'penumbral'|'partial'|'total', obscuration: number, begin: Date,
 *   peak: Date, end: Date, totalBegin: Date|null, totalEnd: Date|null,
 *   moonAltitudeAtPeak: number, visibleFrom: Date, visibleTo: Date }}
 */
export function nextLunarEclipse(now, observer, { includePenumbral = false } = {}) {
  let eclipse = Astronomy.SearchLunarEclipse(toTime(now));
  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    if (includePenumbral || eclipse.kind !== 'penumbral') {
      const half = halfDuration(eclipse) * 60000;
      const begin = new Date(eclipse.peak.date.getTime() - half);
      const end = new Date(eclipse.peak.date.getTime() + half);
      let visibleFrom = null;
      let visibleTo = null;
      for (const t of sampleTimes(begin, end, 5)) {
        if (altitude(Body.Moon, t, observer) > 0) {
          visibleFrom = visibleFrom ?? t;
          visibleTo = t;
        }
      }
      if (visibleFrom && end > now) {
        const total = eclipse.kind === 'total' ? eclipse.sd_total * 60000 : 0;
        return {
          kind: eclipse.kind,
          obscuration: eclipse.obscuration,
          begin,
          peak: toDate(eclipse.peak),
          end,
          totalBegin: total ? new Date(eclipse.peak.date.getTime() - total) : null,
          totalEnd: total ? new Date(eclipse.peak.date.getTime() + total) : null,
          moonAltitudeAtPeak: altitude(Body.Moon, toDate(eclipse.peak), observer),
          visibleFrom,
          visibleTo,
        };
      }
    }
    eclipse = Astronomy.NextLunarEclipse(eclipse.peak);
  }
  return null;
}

/**
 * Next transit of Mercury or Venus across the Sun (worldwide), with a flag
 * telling whether the Sun is up at the house at mid-transit.
 * @returns {{ body: 'mercury'|'venus', start: Date, peak: Date, finish: Date,
 *   separation: number, visible: boolean }}
 */
export function nextTransit(now, observer) {
  const candidates = [Body.Mercury, Body.Venus].map((body) => {
    const transit = Astronomy.SearchTransit(body, toTime(now));
    return {
      body: body.toLowerCase(),
      start: toDate(transit.start),
      peak: toDate(transit.peak),
      finish: toDate(transit.finish),
      separation: transit.separation,
    };
  });
  candidates.sort((a, b) => a.peak - b.peak);
  const next = candidates[0];
  return { ...next, visible: altitude(Body.Sun, next.peak, observer) > 0 };
}
