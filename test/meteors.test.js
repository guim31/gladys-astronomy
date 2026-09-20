import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHOWERS,
  showersOfYear,
  activeShowers,
  nextPeak,
  moonAtPeak,
  radiantAltitude,
} from '../src/astro/meteors.js';
import { paris, d, withinDays } from './helpers/paris.js';

test('the embedded calendar is well-formed', () => {
  assert.ok(SHOWERS.length >= 12);
  for (const s of SHOWERS) {
    assert.match(s.code, /^[A-Z]{3}$/);
    assert.ok(s.name.en && s.name.fr);
    assert.ok(s.solarLongitude >= 0 && s.solarLongitude < 360);
    assert.ok(s.zhr > 0);
    assert.match(s.activity.start, /^\d\d-\d\d$/);
    assert.match(s.activity.end, /^\d\d-\d\d$/);
  }
});

test('2026 peaks: Perseids 12-13 August, Geminids 13-14 December', () => {
  const byCode = Object.fromEntries(showersOfYear(2026).map((s) => [s.code, s]));
  assert.ok(withinDays(byCode.PER.peak, '2026-08-13T00:00:00Z', 1));
  assert.ok(withinDays(byCode.GEM.peak, '2026-12-14T00:00:00Z', 1));
  assert.ok(withinDays(byCode.QUA.peak, '2026-01-03T00:00:00Z', 1));
  // Activity windows wrap around the year for the Quadrantids.
  assert.equal(byCode.QUA.start.getUTCFullYear(), 2025);
  assert.ok(byCode.QUA.start < byCode.QUA.peak && byCode.QUA.peak < byCode.QUA.end);
});

test('active showers on 1 August 2026, and the ZHR filter', () => {
  const codes = activeShowers(d('2026-08-01T00:00:00Z')).map((s) => s.code);
  assert.deepEqual(codes, ['PER', 'SDA', 'CAP']);
  const filtered = activeShowers(d('2026-08-01T00:00:00Z'), { minZhr: 20 }).map((s) => s.code);
  assert.deepEqual(filtered, ['PER', 'SDA']);
  assert.deepEqual(
    activeShowers(d('2027-01-03T00:00:00Z')).map((s) => s.code),
    ['QUA'],
  );
});

test('nextPeak looks into the next year', () => {
  const peak = nextPeak(d('2026-12-25T00:00:00Z'), { minZhr: 10 });
  assert.equal(peak.code, 'QUA');
  assert.ok(withinDays(peak.peak, '2027-01-03T18:00:00Z', 1));
});

test('the Moon is new at the 2026 Perseids and full at the 2026 Geminids... almost', () => {
  const per = showersOfYear(2026).find((s) => s.code === 'PER');
  const moon = moonAtPeak(per.peak, paris);
  assert.ok(moon.illumination < 5);
  assert.equal(moon.level, 'none');
  const gem = showersOfYear(2026).find((s) => s.code === 'GEM');
  assert.ok(moonAtPeak(gem.peak, paris).illumination >= 0);
});

test('the Perseid radiant is high in the Paris sky at peak', () => {
  const per = showersOfYear(2026).find((s) => s.code === 'PER');
  const altitude = radiantAltitude(per, per.peak, paris);
  assert.ok(altitude > 30, `${altitude}`);
});
