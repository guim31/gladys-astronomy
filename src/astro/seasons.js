// -----------------------------------------------------------------------------
// Seasons and Earth's orbit: equinoxes, solstices, day length, apsides.
// -----------------------------------------------------------------------------

import { Astronomy, Body, toTime, toDate, altitude, nextRiseSet, HOUR_MS } from './observer.js';

const SEASON_KEYS = [
  ['mar_equinox', 'march-equinox'],
  ['jun_solstice', 'june-solstice'],
  ['sep_equinox', 'september-equinox'],
  ['dec_solstice', 'december-solstice'],
];

/**
 * Every equinox/solstice of `year`, chronological.
 * @returns {Array<{ kind: string, time: Date }>}
 */
export function seasonsOfYear(year) {
  const seasons = Astronomy.Seasons(year);
  return SEASON_KEYS.map(([field, kind]) => ({ kind, time: toDate(seasons[field]) }));
}

/**
 * Next equinox or solstice after `now`.
 */
export function nextSeason(now) {
  const year = now.getUTCFullYear();
  return [...seasonsOfYear(year), ...seasonsOfYear(year + 1)].find((s) => s.time > now);
}

/**
 * Length of the local day starting at `dayStart` (a local midnight), in hours.
 * Polar day/night: 24 or 0 depending on the Sun at local noon.
 * @returns {{ hours: number, sunrise: Date|null, sunset: Date|null }}
 */
export function dayLength(dayStart, observer) {
  const sunrise = nextRiseSet(Body.Sun, observer, +1, dayStart, 1);
  const sunset = sunrise ? nextRiseSet(Body.Sun, observer, -1, sunrise, 1) : null;
  if (sunrise && sunset) {
    return { hours: (sunset - sunrise) / HOUR_MS, sunrise, sunset };
  }
  const noon = new Date(dayStart.getTime() + 12 * HOUR_MS);
  return { hours: altitude(Body.Sun, noon, observer) > 0 ? 24 : 0, sunrise, sunset };
}

/**
 * Next perihelion or aphelion of the Earth after `now`.
 * @returns {{ kind: 'perihelion'|'aphelion', time: Date, distanceKm: number }}
 */
export function nextApsis(now) {
  const apsis = Astronomy.SearchPlanetApsis(Body.Earth, toTime(now));
  return {
    kind: apsis.kind === 0 ? 'perihelion' : 'aphelion',
    time: toDate(apsis.time),
    distanceKm: apsis.dist_km,
  };
}

/** Earth-Sun distance now, in km. */
export function sunDistanceKm(now) {
  return Astronomy.HelioVector(Body.Earth, toTime(now)).Length() * Astronomy.KM_PER_AU;
}
