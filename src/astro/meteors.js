// -----------------------------------------------------------------------------
// Annual meteor showers: the embedded IMO calendar, peaks recomputed for the
// year from the solar longitude, and how much the Moon spoils each peak.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import {
  Astronomy,
  Body,
  toTime,
  toDate,
  position,
  altitude,
  nightAround,
  sampleTimes,
  round,
  DAY_MS,
} from './observer.js';
import { moonIllumination } from './night.js';

export const SHOWERS = JSON.parse(
  readFileSync(new URL('../data/meteor-showers.json', import.meta.url), 'utf8'),
);

/**
 * IMO solar longitudes are J2000.0; astronomy-engine's SearchSunLongitude
 * works in the equinox of date. General precession, degrees per year.
 */
const PRECESSION_DEG_PER_YEAR = 0.01397;

function monthDay(text) {
  const [month, day] = text.split('-').map(Number);
  return { month, day };
}

function utcDate(year, { month, day }) {
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Peak instant of a shower in `year` (UTC).
 */
export function peakOf(shower, year) {
  const longitude = (shower.solarLongitude + PRECESSION_DEG_PER_YEAR * (year - 2000)) % 360;
  const start = toTime(new Date(Date.UTC(year, 0, 1)));
  return toDate(Astronomy.SearchSunLongitude(longitude, start, 366));
}

/**
 * The showers of `year` with their peak and activity window, chronological.
 * A shower straddling New Year (Quadrantids) belongs to the year of its peak.
 */
export function showersOfYear(year) {
  return SHOWERS.map((shower) => {
    const peak = peakOf(shower, year);
    const startMd = monthDay(shower.activity.start);
    const endMd = monthDay(shower.activity.end);
    let start = utcDate(year, startMd);
    if (start > peak) {
      start = utcDate(year - 1, startMd);
    }
    let end = new Date(utcDate(year, endMd).getTime() + DAY_MS);
    if (end < start) {
      end = new Date(utcDate(year + 1, endMd).getTime() + DAY_MS);
    }
    return { ...shower, year, peak, start, end };
  }).sort((a, b) => a.peak - b.peak);
}

/**
 * Showers whose activity window contains `now`, above `minZhr`, best first.
 */
export function activeShowers(now, { minZhr = 0 } = {}) {
  const year = now.getUTCFullYear();
  const seen = new Set();
  const active = [];
  for (const y of [year - 1, year, year + 1]) {
    for (const shower of showersOfYear(y)) {
      const key = `${shower.code}-${shower.peak.getTime()}`;
      if (seen.has(key) || shower.zhr < minZhr || now < shower.start || now >= shower.end) {
        continue;
      }
      seen.add(key);
      active.push(shower);
    }
  }
  return active.sort((a, b) => b.zhr - a.zhr);
}

/**
 * Next shower peak after `now` (above `minZhr`).
 */
export function nextPeak(now, { minZhr = 0 } = {}) {
  const year = now.getUTCFullYear();
  return [...showersOfYear(year), ...showersOfYear(year + 1)].find(
    (s) => s.peak > now && s.zhr >= minZhr,
  );
}

/**
 * The next `count` shower peaks after `now` (above `minZhr`), chronological.
 */
export function upcomingPeaks(now, { minZhr = 0, count = 4 } = {}) {
  const year = now.getUTCFullYear();
  return [...showersOfYear(year), ...showersOfYear(year + 1)]
    .filter((s) => s.peak > now && s.zhr >= minZhr)
    .slice(0, count);
}

/**
 * Lunar interference on the night of a peak: illumination and whether the
 * Moon is up at all during that night.
 * @returns {{ illumination: number, moonUp: boolean, level: 'none'|'low'|'medium'|'high' }}
 */
export function moonAtPeak(peak, observer) {
  const night = nightAround(peak, observer) ?? {
    start: new Date(peak.getTime() - 6 * 3600000),
    end: new Date(peak.getTime() + 6 * 3600000),
  };
  const illumination = round(moonIllumination(peak), 0);
  let moonUp = false;
  for (const t of sampleTimes(night.start, night.end, 30)) {
    if (altitude(Body.Moon, t, observer) > 0) {
      moonUp = true;
      break;
    }
  }
  let level = 'none';
  if (moonUp) {
    level = illumination >= 70 ? 'high' : illumination >= 40 ? 'medium' : 'low';
    if (illumination < 10) {
      level = 'none';
    }
  }
  return { illumination, moonUp, level };
}

/**
 * Altitude of the radiant at `date` (degrees).
 */
export function radiantAltitude(shower, date, observer) {
  Astronomy.DefineStar(Body.Star1, shower.radiant.raHours, shower.radiant.decDeg, 1000);
  return round(position(Body.Star1, date, observer).altitude, 0);
}
