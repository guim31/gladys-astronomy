import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseKp, summarize, alertLevel, fetchKp } from '../src/aurora/noaa.js';

const fixture = JSON.parse(
  await readFile(new URL('./fixtures/noaa-kp.json', import.meta.url), 'utf8'),
);
const NOW = new Date('2026-09-20T10:00:00Z');

test('parseKp skips the header, parses UTC times and numeric strings, sorts', () => {
  const rows = parseKp(fixture);
  assert.equal(rows.length, fixture.length - 1);
  assert.equal(rows[0].time.toISOString(), '2026-09-19T21:00:00.000Z');
  assert.equal(rows[0].kp, 2.33);
  assert.equal(rows[0].status, 'observed');
  assert.equal(rows.at(-1).status, 'predicted');
});

test('parseKp accepts the object form and rejects garbage', () => {
  const rows = parseKp([
    { time_tag: '2026-09-20T00:00:00', kp: 3, observed: 'observed', noaa_scale: null },
    { time_tag: 'not a date', kp: 3, observed: 'observed' },
    'junk',
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kp, 3);
  assert.throws(() => parseKp({ not: 'an array' }));
});

test('summarize: current Kp is the last measured value, maxima and alerts from the forecast', () => {
  const s = summarize(parseKp(fixture), NOW, { alertKp: 5 });
  assert.equal(s.kpNow, 4.67);
  assert.equal(s.kpMax24h, 5.67);
  assert.equal(s.kpMax72h, 7.33);
  assert.equal(s.alertLevel, 1);
  assert.equal(s.alertNow, false);
  assert.equal(s.nextAlert.kp, 5.33);
  assert.equal(s.nextAlert.start.toISOString(), '2026-09-20T12:00:00.000Z');
  assert.equal(s.nextAlert.end.toISOString(), '2026-09-20T15:00:00.000Z');
  assert.deepEqual(
    s.daily.map((d) => d.kp),
    [5.67, 6.33, 2.67],
  );
});

test('summarize with no future rows and a high threshold', () => {
  const s = summarize(parseKp(fixture), new Date('2026-09-30T00:00:00Z'), { alertKp: 9 });
  assert.equal(s.kpNow, 1.0);
  assert.equal(s.kpMax24h, null);
  assert.equal(s.nextAlert, null);
  assert.deepEqual(s.daily, []);
});

test('alert levels', () => {
  assert.equal(alertLevel(2), 0);
  assert.equal(alertLevel(4), 1);
  assert.equal(alertLevel(5.5), 2);
  assert.equal(alertLevel(7), 3);
  assert.equal(alertLevel(3.5, 3), 1);
  assert.equal(alertLevel(null), 0);
});

test('fetchKp sends a User-Agent, honours HTTP errors', async () => {
  let seen = null;
  const ok = await fetchKp({
    fetchImpl: async (url, options) => {
      seen = { url, options };
      return { ok: true, status: 200, json: async () => fixture };
    },
  });
  assert.equal(ok.length, fixture.length - 1);
  assert.match(seen.url, /swpc\.noaa\.gov/);
  assert.match(seen.options.headers['User-Agent'], /gladys-astronomy/);
  await assert.rejects(
    fetchKp({ fetchImpl: async () => ({ ok: false, status: 503 }) }),
    /HTTP 503/,
  );
});
