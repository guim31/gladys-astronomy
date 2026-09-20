import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localParts, localDayKey, localMidnight, nextLocalTime } from '../src/time.js';
import { createFormatter, NONE } from '../src/formatters.js';

const TZ = 'Europe/Paris';

test('local parts and day key in a timezone', () => {
  const date = new Date('2026-09-22T23:30:00Z'); // 01:30 the 23rd in Paris (CEST)
  assert.deepEqual(localParts(date, TZ), { year: 2026, month: 9, day: 23, hour: 1, minute: 30 });
  assert.equal(localDayKey(date, TZ), '2026-09-23');
  assert.equal(localDayKey(date, 'UTC'), '2026-09-22');
});

test('localMidnight and nextLocalTime handle the DST change', () => {
  assert.equal(
    localMidnight(new Date('2026-09-22T23:30:00Z'), TZ).toISOString(),
    '2026-09-22T22:00:00.000Z',
  );
  // 25 October 2026: clocks go back at 03:00 CEST -> 02:00 CET.
  const beforeChange = new Date('2026-10-24T12:00:00Z');
  const next = nextLocalTime('03:00', beforeChange, TZ);
  assert.deepEqual(localParts(next, TZ), { year: 2026, month: 10, day: 25, hour: 3, minute: 0 });
  assert.equal(next.toISOString(), '2026-10-25T02:00:00.000Z');
  // Strictly after `from`.
  const at3 = nextLocalTime('03:00', next, TZ);
  assert.equal(localDayKey(at3, TZ), '2026-10-26');
});

test('formatter: dates, times, numbers and the NONE placeholder per language', () => {
  const fr = createFormatter('fr', TZ);
  const en = createFormatter('en', TZ);
  const date = new Date('2026-08-12T18:17:00Z');
  assert.equal(fr.date(date), '12/08/2026');
  assert.equal(fr.time(date), '20:17');
  assert.equal(en.dateTime(date), '12/08/2026 20:17');
  assert.equal(fr.num(1.25, 1), '1,3');
  assert.equal(en.num(1.25, 1), '1.3');
  assert.equal(fr.num(null), NONE);
  assert.equal(fr.date(null), NONE);
  assert.equal(fr.duration(273), '4 h 33');
  assert.equal(en.duration(45), '45 min');
  assert.equal(fr.body('saturn'), 'Saturne');
  assert.equal(en.body('saturn'), 'Saturn');
  assert.equal(fr.planets([]), 'Aucune planète à l’œil nu');
  assert.equal(en.conjunction(null), NONE);
  assert.equal(
    createFormatter('xx', TZ).t.solar,
    'Solaire',
    'unknown language falls back to French',
  );
});
