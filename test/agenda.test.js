import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAgenda, CATEGORIES } from '../src/agenda.js';
import { createFormatter } from '../src/formatters.js';
import { computedSnapshot } from './helpers/snapshot.js';

const fmt = createFormatter('fr', 'Europe/Paris');

test('the agenda of August 2026 holds the eclipse, the Perseids and the lunar eclipse, in order', async () => {
  const { snapshot, now } = await computedSnapshot('2026-08-01T10:00:00Z');
  const events = buildAgenda(snapshot, { fmt, now, horizonDays: 30 });
  const titles = events.map((e) => e.title);
  const solar = titles.indexOf('Éclipse partielle de Soleil');
  const perseids = titles.indexOf('Pic des Perséides');
  const lunar = titles.indexOf('Éclipse partielle de Lune');
  assert.ok(solar >= 0 && perseids > solar && lunar > perseids, titles.join(' | '));
  for (let i = 1; i < events.length; i += 1) {
    assert.ok(events[i].time >= events[i - 1].time);
  }
  assert.ok(events.every((e) => e.time > now));
  assert.ok(events.every((e) => CATEGORIES.includes(e.category)));
});

test('categories filter and horizon bound the list; seasons carry no visibility', async () => {
  const { snapshot, now } = await computedSnapshot('2026-09-20T10:00:00Z');
  const seasons = buildAgenda(snapshot, { fmt, now, categories: ['seasons'], horizonDays: 365 });
  assert.deepEqual(
    seasons.map((e) => e.title),
    ['Équinoxe d’automne', 'Périhélie'],
  );
  assert.ok(seasons.every((e) => e.visible === null && !e.subtitle.includes('visible')));
  const short = buildAgenda(snapshot, { fmt, now, horizonDays: 5 });
  assert.deepEqual(
    short.map((e) => e.category),
    ['seasons'],
  );
  assert.deepEqual(buildAgenda({}, { fmt, now }), []);
});
