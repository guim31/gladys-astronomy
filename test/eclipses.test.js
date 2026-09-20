import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextSolarEclipse, nextLunarEclipse, nextTransit } from '../src/astro/eclipses.js';
import { paris, reykjavik, d, withinDays } from './helpers/paris.js';

test('the 12 August 2026 eclipse is a deep partial from Paris, total from Reykjavik', () => {
  const e = nextSolarEclipse(d('2026-01-01T00:00:00Z'), paris);
  assert.equal(e.kind, 'partial');
  assert.ok(withinDays(e.peak, '2026-08-12T18:17:00Z', 0.1));
  assert.ok(e.obscuration > 0.85 && e.obscuration < 0.99);
  assert.ok(e.peakAltitude > 0);
  assert.ok(e.partialBegin < e.peak && e.peak < e.partialEnd);
  assert.equal(e.totalBegin, null);

  const r = nextSolarEclipse(d('2026-01-01T00:00:00Z'), reykjavik);
  assert.equal(r.kind, 'total');
  assert.ok(withinDays(r.peak, '2026-08-12T17:48:00Z', 0.1));
  assert.ok(r.totalBegin < r.peak && r.peak < r.totalEnd);
});

test('after the eclipse, the next one from Paris is 2 August 2027', () => {
  const e = nextSolarEclipse(d('2026-09-20T12:00:00Z'), paris);
  assert.equal(e.kind, 'partial');
  assert.ok(withinDays(e.peak, '2027-08-02T09:00:00Z', 0.1));
});

test('the total lunar eclipse of 3 March 2026 is skipped from Paris (Moon below the horizon)', () => {
  const e = nextLunarEclipse(d('2026-01-01T00:00:00Z'), paris);
  assert.equal(e.kind, 'partial');
  assert.ok(withinDays(e.peak, '2026-08-28T04:12:00Z', 0.1));
  assert.ok(e.visibleFrom >= e.begin && e.visibleTo <= e.end);
  assert.ok(e.moonAltitudeAtPeak > 0);
  assert.equal(e.totalBegin, null);
});

test('penumbral lunar eclipses are skipped unless asked for', () => {
  const strict = nextLunarEclipse(d('2026-09-20T00:00:00Z'), paris);
  const loose = nextLunarEclipse(d('2026-09-20T00:00:00Z'), paris, { includePenumbral: true });
  assert.notEqual(strict.kind, 'penumbral');
  assert.ok(loose.peak <= strict.peak);
});

test('the next transit is Mercury on 13 November 2032, in daylight from Paris', () => {
  const t = nextTransit(d('2026-09-20T00:00:00Z'), paris);
  assert.equal(t.body, 'mercury');
  assert.ok(withinDays(t.peak, '2032-11-13T08:54:00Z', 0.1));
  assert.ok(t.start < t.peak && t.peak < t.finish);
  assert.equal(t.visible, true);
});
