// -----------------------------------------------------------------------------
// Shared astronomy helpers on top of astronomy-engine.
//
// Pure: every function takes plain `Date`s and an `Observer` and returns plain
// values. No timezone, no formatting, no I/O.
// -----------------------------------------------------------------------------

import * as Astronomy from 'astronomy-engine';

const { Body, Observer, MakeTime, Equator, Horizon, SearchRiseSet } = Astronomy;

export { Astronomy, Body };

export const HOUR_MS = 3600 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/** The five naked-eye planets, brightest usual order last. */
export const NAKED_EYE_PLANETS = [Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn];

/**
 * Build an astronomy-engine observer from house coordinates.
 * @param {{ latitude: number, longitude: number, elevation?: number }} location
 */
export function makeObserver({ latitude, longitude, elevation = 0 }) {
  return new Observer(latitude, longitude, elevation);
}

/** Date -> AstroTime. */
export function toTime(date) {
  return MakeTime(date);
}

/** AstroTime | null -> Date | null. */
export function toDate(time) {
  return time ? new Date(time.date.getTime()) : null;
}

/**
 * Apparent altitude/azimuth of a body (refraction applied).
 * @returns {{ altitude: number, azimuth: number, ra: number, dec: number }}
 */
export function position(body, date, observer) {
  const time = toTime(date);
  const eq = Equator(body, time, observer, true, true);
  const hor = Horizon(time, observer, eq.ra, eq.dec, 'normal');
  return { altitude: hor.altitude, azimuth: hor.azimuth, ra: eq.ra, dec: eq.dec };
}

export function altitude(body, date, observer) {
  return position(body, date, observer).altitude;
}

/**
 * Next rise (+1) or set (-1) of a body after `date`, within `limitDays`.
 * @returns {Date | null}
 */
export function nextRiseSet(body, observer, direction, date, limitDays = 2) {
  return toDate(SearchRiseSet(body, observer, direction, toTime(date), limitDays));
}

/**
 * The night "around" `now`: the sunset that started it (or the next one if it
 * is daytime) and the sunrise that ends it. Timezone-free by construction.
 * @returns {{ start: Date, end: Date, isNight: boolean } | null} null at polar
 *   latitudes when the Sun does not set/rise within two days.
 */
export function nightAround(now, observer) {
  const nextRise = nextRiseSet(Body.Sun, observer, +1, now, 2);
  const nextSet = nextRiseSet(Body.Sun, observer, -1, now, 2);
  if (!nextRise || !nextSet) {
    return null;
  }
  if (nextRise < nextSet) {
    // Night in progress: find the set that started it.
    const previousSet = nextRiseSet(
      Body.Sun,
      observer,
      -1,
      new Date(nextRise.getTime() - DAY_MS - 2 * HOUR_MS),
      1.2,
    );
    if (!previousSet) {
      return null;
    }
    return { start: previousSet, end: nextRise, isNight: true };
  }
  const riseAfter = nextRiseSet(Body.Sun, observer, +1, nextSet, 2);
  if (!riseAfter) {
    return null;
  }
  return { start: nextSet, end: riseAfter, isNight: false };
}

/**
 * Iterate `[from, to]` every `stepMinutes`, inclusive of both ends.
 */
export function* sampleTimes(from, to, stepMinutes) {
  const step = stepMinutes * 60000;
  for (let t = from.getTime(); t < to.getTime(); t += step) {
    yield new Date(t);
  }
  yield new Date(to.getTime());
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
