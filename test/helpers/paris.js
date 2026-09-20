// Shared reference observer for the astronomy tests: Paris, France.
import { makeObserver } from '../../src/astro/observer.js';

export const PARIS = { latitude: 48.8566, longitude: 2.3522, elevation: 35 };
export const TROMSO = { latitude: 69.65, longitude: 18.95, elevation: 0 };
export const REYKJAVIK = { latitude: 64.1, longitude: -21.9, elevation: 0 };

export const paris = makeObserver(PARIS);
export const tromso = makeObserver(TROMSO);
export const reykjavik = makeObserver(REYKJAVIK);

export const d = (iso) => new Date(iso);
export const DAY_MS = 24 * 3600 * 1000;

/** |a - b| in minutes. */
export function minutesApart(a, b) {
  return Math.abs(a - b) / 60000;
}

/** Same UTC calendar day, give or take `days`. */
export function withinDays(date, iso, days = 1) {
  return Math.abs(date - new Date(iso)) <= days * DAY_MS;
}
