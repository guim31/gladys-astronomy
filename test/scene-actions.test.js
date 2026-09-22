import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENE_ACTIONS, NO_LOCATION } from '../src/scene-actions.js';
import { computedSnapshot } from './helpers/snapshot.js';

process.env.TZ = 'Europe/Paris';

test('next_event: any category, then eclipses only, in French and English', async () => {
  const { snapshot, config, now } = await computedSnapshot('2026-09-20T10:00:00Z');
  const any = SCENE_ACTIONS.next_event({ category: 'any' }, { snapshot, config, now });
  assert.equal(any.found, true);
  assert.equal(any.category, 'seasons');
  assert.equal(any.title, 'Équinoxe d’automne');
  assert.equal(any.days_until, 2);
  assert.equal(typeof any.minutes_until, 'number');

  const eclipse = SCENE_ACTIONS.next_event(
    { category: 'eclipses', language: 'en' },
    { snapshot, config, now },
  );
  assert.equal(eclipse.title, 'Partial solar eclipse');
  assert.equal(eclipse.local_time, '02/08/2027 10:00');
  assert.equal(eclipse.days_until, 315);
  assert.equal(eclipse.visible, true);
});

test('next_event with nothing to find, and without a location', async () => {
  const { snapshot, config, now } = await computedSnapshot('2026-09-20T10:00:00Z');
  const empty = { ...snapshot, rare: { conjunctions: [], planetEvents: [] }, night: {} };
  assert.deepEqual(SCENE_ACTIONS.next_event({}, { snapshot: empty, config, now }), {
    found: false,
  });
  assert.throws(() => SCENE_ACTIONS.next_event({}, { snapshot: undefined, config, now }), {
    message: NO_LOCATION,
  });
});

test('tonight_summary returns scalars only', async () => {
  const { snapshot, config } = await computedSnapshot('2026-09-20T10:00:00Z');
  const out = SCENE_ACTIONS.tonight_summary({ language: 'fr' }, { snapshot, config });
  for (const [key, value] of Object.entries(out)) {
    assert.ok(['string', 'number', 'boolean'].includes(typeof value), key);
  }
  assert.match(out.summary, /^Nuit astronomique/);
  assert.equal(out.dark_start, '01:15');
  assert.equal(out.best_score, 10);
  assert.match(out.planets, /Jupiter/);
  assert.throws(() => SCENE_ACTIONS.tonight_summary({}, { snapshot: {}, config }));
});
