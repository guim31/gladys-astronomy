import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextSeason,
  seasonsOfYear,
  dayLength,
  nextApsis,
  sunDistanceKm,
} from '../src/astro/seasons.js';
import { paris, tromso, d, minutesApart, withinDays } from './helpers/paris.js';

test('2026 equinoxes and solstices', () => {
  const seasons = seasonsOfYear(2026);
  assert.deepEqual(
    seasons.map((s) => s.kind),
    ['march-equinox', 'june-solstice', 'september-equinox', 'december-solstice'],
  );
  assert.ok(minutesApart(seasons[2].time, d('2026-09-23T00:05:00Z')) < 10);
  assert.ok(minutesApart(seasons[3].time, d('2026-12-21T20:50:00Z')) < 10);
});

test('nextSeason crosses the year boundary', () => {
  assert.equal(nextSeason(d('2026-09-20T12:00:00Z')).kind, 'september-equinox');
  const after = nextSeason(d('2026-12-25T00:00:00Z'));
  assert.equal(after.kind, 'march-equinox');
  assert.equal(after.time.getUTCFullYear(), 2027);
});

test('day length in Paris at the June solstice, and its daily change near the equinox', () => {
  const june = dayLength(d('2026-06-20T22:00:00Z'), paris);
  assert.ok(june.hours > 16.0 && june.hours < 16.3, `${june.hours}`);
  const sep22 = dayLength(d('2026-09-21T22:00:00Z'), paris).hours;
  const sep21 = dayLength(d('2026-09-20T22:00:00Z'), paris).hours;
  const deltaMinutes = (sep22 - sep21) * 60;
  assert.ok(deltaMinutes > -4.5 && deltaMinutes < -3.3, `${deltaMinutes}`);
});

test('midnight sun in Tromso: 24 h day, no rise/set', () => {
  const day = dayLength(d('2026-06-20T22:00:00Z'), tromso);
  assert.equal(day.hours, 24);
  assert.equal(day.sunrise, null);
});

test('perihelion early January, aphelion early July', () => {
  const peri = nextApsis(d('2026-09-20T00:00:00Z'));
  assert.equal(peri.kind, 'perihelion');
  assert.ok(withinDays(peri.time, '2027-01-03T00:00:00Z', 1.5));
  assert.ok(peri.distanceKm > 147e6 && peri.distanceKm < 147.2e6);
  const aph = nextApsis(d('2026-02-01T00:00:00Z'));
  assert.equal(aph.kind, 'aphelion');
  assert.ok(withinDays(aph.time, '2026-07-06T00:00:00Z', 1.5));
});

test('Earth-Sun distance stays within the orbit', () => {
  const km = sunDistanceKm(d('2026-09-20T00:00:00Z'));
  assert.ok(km > 147e6 && km < 152.2e6);
});
