// -----------------------------------------------------------------------------
// The observing night: twilights, the moonless dark window, a sky score.
// -----------------------------------------------------------------------------

import {
  Astronomy,
  Body,
  toTime,
  toDate,
  altitude,
  nightAround,
  sampleTimes,
  clamp,
  round,
} from './observer.js';

export const TWILIGHTS = [
  ['civil', -6],
  ['nautical', -12],
  ['astronomical', -18],
];

/**
 * Dusk/dawn for each twilight threshold of a night. `null` when the Sun never
 * gets that low (summer at mid-latitudes, polar regions).
 * @param {{ start: Date, end: Date }} night from nightAround()
 * @returns {Record<'civil'|'nautical'|'astronomical', { dusk: Date|null, dawn: Date|null }>}
 */
export function twilights(night, observer) {
  const result = {};
  for (const [name, degrees] of TWILIGHTS) {
    const dusk = toDate(
      Astronomy.SearchAltitude(Body.Sun, observer, -1, toTime(night.start), 1, degrees),
    );
    const dawn = dusk
      ? toDate(Astronomy.SearchAltitude(Body.Sun, observer, +1, toTime(dusk), 1, degrees))
      : null;
    // A dusk found after the night ended belongs to the next night: drop it.
    const valid = dusk && dawn && dusk < night.end && dawn <= night.end;
    result[name] = valid ? { dusk, dawn } : { dusk: null, dawn: null };
  }
  return result;
}

/**
 * The darkest available window of the night: astronomical night if it exists,
 * else nautical, else civil, else the whole sun-down night.
 * @returns {{ level: 'astronomical'|'nautical'|'civil'|'none', start: Date, end: Date }}
 */
export function darkestWindow(night, tw) {
  for (const level of ['astronomical', 'nautical', 'civil']) {
    if (tw[level].dusk) {
      return { level, start: tw[level].dusk, end: tw[level].dawn };
    }
  }
  return { level: 'none', start: night.start, end: night.end };
}

/** Illuminated fraction of the Moon, 0-100. */
export function moonIllumination(date) {
  return Astronomy.Illumination(Body.Moon, toTime(date)).phase_fraction * 100;
}

/**
 * True when the Moon does not spoil the sky: below the horizon, or thin.
 */
function moonIsQuiet(date, observer, moonMaxIllumination) {
  return altitude(Body.Moon, date, observer) < 0 || moonIllumination(date) < moonMaxIllumination;
}

/**
 * Longest contiguous moon-free stretch inside the darkest window.
 * @returns {{ start: Date, end: Date, minutes: number } | null}
 */
export function moonlessWindow(window, observer, moonMaxIllumination, stepMinutes = 5) {
  let best = null;
  let current = null;
  const consider = (candidate) => {
    if (candidate && (!best || candidate.minutes > best.minutes)) {
      best = candidate;
    }
  };
  for (const t of sampleTimes(window.start, window.end, stepMinutes)) {
    if (moonIsQuiet(t, observer, moonMaxIllumination)) {
      if (!current) {
        current = { start: t, end: t, minutes: 0 };
      }
      current.end = t;
      current.minutes = Math.round((current.end - current.start) / 60000);
    } else {
      consider(current);
      current = null;
    }
  }
  consider(current);
  return best;
}

/**
 * Sky quality at one instant, 0 (daylight) to 10 (astronomical night, no Moon).
 * `bortle` (1-9) scales the score for light pollution; 0 ignores it.
 */
export function skyScore(date, observer, { bortle = 0 } = {}) {
  const sunAltitude = altitude(Body.Sun, date, observer);
  const darkness = clamp((-6 - sunAltitude) / 12, 0, 1);
  if (darkness === 0) {
    return 0;
  }
  const moonAltitude = altitude(Body.Moon, date, observer);
  const moonFactor = (moonIllumination(date) / 100) * clamp((moonAltitude + 5) / 35, 0, 1);
  let score = 10 * darkness * (1 - 0.85 * moonFactor);
  if (bortle > 0) {
    score *= (10 - clamp(bortle, 1, 9)) / 9;
  }
  return round(score, 1);
}

/**
 * Everything about the night around `now`.
 */
export function describeNight(now, observer, { moonMaxIllumination = 30, bortle = 0 } = {}) {
  const night = nightAround(now, observer);
  if (!night) {
    return { night: null };
  }
  const tw = twilights(night, observer);
  const darkest = darkestWindow(night, tw);
  const moonless = moonlessWindow(darkest, observer, moonMaxIllumination);
  let bestScore = 0;
  let bestAt = null;
  for (const t of sampleTimes(night.start, night.end, 15)) {
    const score = skyScore(t, observer, { bortle });
    if (score > bestScore) {
      bestScore = score;
      bestAt = t;
    }
  }
  const midnight = new Date((night.start.getTime() + night.end.getTime()) / 2);
  return {
    night,
    twilights: tw,
    darkest,
    moonless,
    bestScore,
    bestAt,
    moonIllumination: round(moonIllumination(midnight), 0),
    noAstronomicalNight: !tw.astronomical.dusk,
  };
}
