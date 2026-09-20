// -----------------------------------------------------------------------------
// Close approaches between the Moon and the naked-eye planets, and between
// planets: coarse scan of the apparent separation, refined at each local
// minimum by a golden-section search.
// -----------------------------------------------------------------------------

import {
  Astronomy,
  Body,
  NAKED_EYE_PLANETS,
  toTime,
  altitude,
  sampleTimes,
  round,
  HOUR_MS,
  DAY_MS,
} from './observer.js';

const GOLDEN = (Math.sqrt(5) - 1) / 2;

/** Bodies too close to the Sun cannot be seen, whatever their separation. */
const MIN_ANGLE_FROM_SUN = 15;

/**
 * Every pair worth watching: Moon x planets, then planet x planet.
 */
export function watchedPairs() {
  const pairs = NAKED_EYE_PLANETS.map((p) => [Body.Moon, p]);
  for (let i = 0; i < NAKED_EYE_PLANETS.length; i += 1) {
    for (let j = i + 1; j < NAKED_EYE_PLANETS.length; j += 1) {
      pairs.push([NAKED_EYE_PLANETS[i], NAKED_EYE_PLANETS[j]]);
    }
  }
  return pairs;
}

/** Apparent geocentric separation in degrees. */
export function separation(bodyA, bodyB, date) {
  const time = toTime(date);
  return Astronomy.AngleBetween(
    Astronomy.GeoVector(bodyA, time, true),
    Astronomy.GeoVector(bodyB, time, true),
  );
}

/**
 * Golden-section search of the separation minimum in [a, b] (Dates).
 * @returns {{ time: Date, separation: number }}
 */
export function refineMinimum(bodyA, bodyB, a, b, iterations = 25) {
  let lo = a.getTime();
  let hi = b.getTime();
  let x1 = hi - GOLDEN * (hi - lo);
  let x2 = lo + GOLDEN * (hi - lo);
  let f1 = separation(bodyA, bodyB, new Date(x1));
  let f2 = separation(bodyA, bodyB, new Date(x2));
  for (let i = 0; i < iterations; i += 1) {
    if (f1 < f2) {
      hi = x2;
      x2 = x1;
      f2 = f1;
      x1 = hi - GOLDEN * (hi - lo);
      f1 = separation(bodyA, bodyB, new Date(x1));
    } else {
      lo = x1;
      x1 = x2;
      f1 = f2;
      x2 = lo + GOLDEN * (hi - lo);
      f2 = separation(bodyA, bodyB, new Date(x2));
    }
  }
  const time = new Date((lo + hi) / 2);
  return { time, separation: separation(bodyA, bodyB, time) };
}

/**
 * True when both bodies are up (> 5 deg) while the Sun is down (< -6 deg) at
 * some hour within 12 h of `time`.
 */
function visibleAround(bodyA, bodyB, time, observer) {
  const from = new Date(time.getTime() - 12 * HOUR_MS);
  const to = new Date(time.getTime() + 12 * HOUR_MS);
  for (const t of sampleTimes(from, to, 60)) {
    if (
      altitude(Body.Sun, t, observer) < -6 &&
      altitude(bodyA, t, observer) > 5 &&
      altitude(bodyB, t, observer) > 5
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Local minima of the separation of one pair over `[start, start + days]`
 * that get closer than `maxSeparation` degrees.
 */
export function scanPair(bodyA, bodyB, start, days, { maxSeparation, stepHours = 6 }) {
  const stepMs = stepHours * HOUR_MS;
  const end = new Date(start.getTime() + days * DAY_MS);
  const found = [];
  let previous = null;
  let current = { t: start.getTime(), s: separation(bodyA, bodyB, start) };
  for (let t = start.getTime() + stepMs; t <= end.getTime() + stepMs; t += stepMs) {
    const next = { t, s: separation(bodyA, bodyB, new Date(t)) };
    if (
      previous &&
      current.s <= previous.s &&
      current.s <= next.s &&
      current.s < maxSeparation + 2
    ) {
      const refined = refineMinimum(bodyA, bodyB, new Date(previous.t), new Date(next.t));
      if (refined.separation <= maxSeparation && refined.time >= start && refined.time <= end) {
        found.push(refined);
      }
    }
    previous = current;
    current = next;
  }
  return found;
}

/**
 * All upcoming conjunctions, chronological.
 * @returns {Array<{ bodies: [string, string], time: Date, separation: number,
 *   visible: boolean, angleFromSun: number }>}
 */
export function upcomingConjunctions(
  now,
  observer,
  { lookaheadDays = 90, maxSeparation = 3 } = {},
) {
  const result = [];
  for (const [bodyA, bodyB] of watchedPairs()) {
    for (const minimum of scanPair(bodyA, bodyB, now, lookaheadDays, { maxSeparation })) {
      const angleFromSun = Math.min(
        Astronomy.AngleFromSun(bodyA, toTime(minimum.time)),
        Astronomy.AngleFromSun(bodyB, toTime(minimum.time)),
      );
      if (angleFromSun < MIN_ANGLE_FROM_SUN) {
        continue;
      }
      result.push({
        bodies: [bodyA.toLowerCase(), bodyB.toLowerCase()],
        time: minimum.time,
        separation: round(minimum.separation, 1),
        angleFromSun: round(angleFromSun, 0),
        visible: visibleAround(bodyA, bodyB, minimum.time, observer),
      });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}
