import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeNight, skyScore } from '../src/astro/night.js';
import { nightAround } from '../src/astro/observer.js';
import { paris, tromso, d, minutesApart } from './helpers/paris.js';

test('nightAround finds the night in progress or the one to come', () => {
  const day = nightAround(d('2026-09-22T12:00:00Z'), paris);
  assert.equal(day.isNight, false);
  assert.ok(day.start > d('2026-09-22T12:00:00Z'));
  const night = nightAround(d('2026-09-23T01:00:00Z'), paris);
  assert.equal(night.isNight, true);
  assert.ok(minutesApart(night.start, day.start) < 1);
  assert.ok(minutesApart(night.end, day.end) < 1);
  assert.equal(nightAround(d('2026-06-21T12:00:00Z'), tromso), null);
});

test('astronomical twilight in Paris around the equinox', () => {
  const n = describeNight(d('2026-09-22T12:00:00Z'), paris);
  const { dusk, dawn } = n.twilights.astronomical;
  assert.ok(minutesApart(dusk, d('2026-09-22T19:35:00Z')) < 10);
  assert.ok(minutesApart(dawn, d('2026-09-23T03:51:00Z')) < 10);
  assert.equal(n.darkest.level, 'astronomical');
  assert.equal(n.noAstronomicalNight, false);
  assert.ok(n.twilights.civil.dusk < n.twilights.nautical.dusk);
  assert.ok(n.twilights.nautical.dusk < dusk);
});

test('no astronomical night in Paris at the June solstice: falls back to nautical', () => {
  const n = describeNight(d('2026-06-21T12:00:00Z'), paris);
  assert.equal(n.twilights.astronomical.dusk, null);
  assert.equal(n.noAstronomicalNight, true);
  assert.equal(n.darkest.level, 'nautical');
});

test('new Moon: the whole astronomical night is moonless; full Moon: none', () => {
  const dark = describeNight(d('2026-08-12T12:00:00Z'), paris);
  assert.ok(dark.moonless);
  assert.ok(minutesApart(dark.moonless.start, dark.darkest.start) < 1);
  assert.ok(minutesApart(dark.moonless.end, dark.darkest.end) < 1);
  assert.ok(dark.moonless.minutes > 280);
  assert.equal(dark.bestScore, 10);
  assert.ok(dark.moonIllumination < 5);

  const bright = describeNight(d('2026-08-28T12:00:00Z'), paris);
  assert.equal(bright.moonless, null);
  assert.ok(bright.bestScore < 6);
  assert.ok(bright.moonIllumination > 95);
});

test('sky score: 0 at noon, 10 in the moonless astronomical night, lower with light pollution', () => {
  assert.equal(skyScore(d('2026-08-12T12:00:00Z'), paris), 0);
  const night = skyScore(d('2026-08-13T00:00:00Z'), paris);
  assert.ok(night >= 9.5, `${night}`);
  const city = skyScore(d('2026-08-13T00:00:00Z'), paris, { bortle: 8 });
  assert.ok(city < 3 && city > 0, `${city}`);
});

test('polar day: no night at all', () => {
  const n = describeNight(d('2026-06-21T12:00:00Z'), tromso);
  assert.equal(n.night, null);
});
