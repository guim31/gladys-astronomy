import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  planEvents,
  createEventScheduler,
  auroraEventData,
  TRIGGER_KEYS,
  CATCH_UP_MS,
} from '../src/scene-events.js';
import { createFormatter } from '../src/formatters.js';
import { createFakeGladys } from './helpers/fakeGladys.js';
import { computedSnapshot } from './helpers/snapshot.js';
import { minutesApart } from './helpers/paris.js';

const fmt = createFormatter('fr', 'Europe/Paris');
const tempDir = () => mkdtempSync(path.join(tmpdir(), 'gladys-astronomy-events-'));

async function waitFor(predicate, label) {
  for (let i = 0; i < 2000; i += 1) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.fail(`timed out waiting for ${label}`);
}

test('planEvents on 10 August 2026: the eclipse, the Perseids evening, the equinox', async () => {
  const { snapshot } = await computedSnapshot('2026-08-10T10:00:00Z');
  const events = planEvents(snapshot, { fmt });
  for (let i = 1; i < events.length; i += 1) {
    assert.ok(events[i].at >= events[i - 1].at);
  }
  const begin = events.find((e) => e.id === 'eclipse_phase:sun:begin:2026-08-12');
  assert.ok(minutesApart(begin.at, new Date('2026-08-12T17:22:00Z')) < 5);
  assert.equal(begin.data.phase, 'begin');
  assert.equal(begin.data.kind, 'partial');
  assert.ok(events.some((e) => e.id === 'eclipse_phase:sun:peak:2026-08-12'));

  const lunar = events.find((e) => e.id === 'eclipse_phase:moon:begin:2026-08-28');
  assert.equal(lunar.data.body, 'moon');

  const perseids = events.find((e) => e.id === 'meteor_peak_night:PER:2026');
  assert.ok(perseids.at > new Date('2026-08-12T19:00:00Z'));
  assert.ok(perseids.at < new Date('2026-08-12T20:30:00Z'), 'civil dusk before the peak night');
  assert.equal(perseids.data.shower, 'PER');

  const season = events.find((e) => e.key === 'season_starting');
  assert.equal(season.data.kind, 'september-equinox');
  assert.ok(minutesApart(season.at, new Date('2026-09-23T00:05:00Z')) < 10);

  const dark = events.find((e) => e.key === 'dark_window_starting');
  assert.ok(dark.data.duration_minutes > 60);
  const conjunctions = events.filter((e) => e.key === 'conjunction_tonight');
  assert.ok(conjunctions.length > 0);
  assert.ok(conjunctions.every((e) => ['yes', 'no'].includes(e.data.involves_moon)));
});

test('the ids are stable across two plans of the same sky', async () => {
  const a = await computedSnapshot('2026-08-01T10:00:00Z');
  const b = await computedSnapshot('2026-08-01T10:30:00Z');
  const idsA = new Set(planEvents(a.snapshot, { fmt }).map((e) => e.id));
  const idsB = planEvents(b.snapshot, { fmt }).map((e) => e.id);
  assert.ok(idsB.every((id) => idsA.has(id)));
});

test('only declared trigger keys are planned', async () => {
  const { snapshot } = await computedSnapshot('2026-08-01T10:00:00Z');
  for (const e of planEvents(snapshot, { fmt })) {
    assert.ok(TRIGGER_KEYS.includes(e.key), e.key);
  }
});

test('the scheduler fires at the right time, once, and not again after a restart', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.parse('2026-08-12T16:00:00Z') });
  const dataDir = tempDir();
  const gladys = createFakeGladys();
  const events = [
    {
      key: 'eclipse_phase',
      id: 'eclipse_phase:sun:begin:2026-08-12',
      at: new Date('2026-08-12T17:22:00Z'),
      data: { body: 'sun', phase: 'begin' },
    },
    {
      key: 'season_starting',
      id: 'season_starting:september-equinox:2026',
      at: new Date('2026-09-23T00:05:00Z'),
      data: { kind: 'september-equinox' },
    },
  ];
  const scheduler = createEventScheduler({ gladys, dataDir });
  await scheduler.replan(events);
  assert.deepEqual(scheduler.armed(), ['eclipse_phase:sun:begin:2026-08-12'], 'only the next 24 h');
  t.mock.timers.tick(81 * 60 * 1000);
  assert.equal(gladys.sceneEvents.length, 0, 'one minute early');
  t.mock.timers.tick(60 * 1000);
  await waitFor(() => gladys.sceneEvents.length === 1, 'the eclipse event');
  await scheduler.idle();
  assert.equal(gladys.sceneEvents[0].key, 'eclipse_phase');
  scheduler.stop();

  // Restart right after: the file remembers the event, nothing is replayed.
  const again = createEventScheduler({ gladys, dataDir });
  await again.replan(events);
  assert.equal(gladys.sceneEvents.length, 1);
  again.stop();
});

test('catch-up: an event missed by less than 15 minutes fires on replan, older ones are dropped', async (t) => {
  const now = Date.parse('2026-08-12T17:30:00Z');
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now });
  const gladys = createFakeGladys();
  const scheduler = createEventScheduler({ gladys, dataDir: tempDir() });
  await scheduler.replan([
    { key: 'eclipse_phase', id: 'recent', at: new Date(now - 8 * 60 * 1000), data: {} },
    { key: 'eclipse_phase', id: 'old', at: new Date(now - CATCH_UP_MS - 60000), data: {} },
  ]);
  assert.equal(gladys.sceneEvents.length, 1);
  scheduler.stop();
});

test('a refusal by Gladys is not retried; a network error is', async (t) => {
  const now = Date.parse('2026-08-12T17:30:00Z');
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now });
  const due = [{ key: 'eclipse_phase', id: 'x', at: new Date(now - 60000), data: {} }];

  const refused = createFakeGladys({
    sceneEventError: Object.assign(new Error('not declared'), { status: 404 }),
  });
  const s1 = createEventScheduler({ gladys: refused, dataDir: tempDir() });
  await s1.replan(due);
  refused.sceneEventError = null;
  await s1.replan(due);
  assert.equal(refused.sceneEvents.length, 0, 'marked as done after a 404');
  s1.stop();

  const flaky = createFakeGladys({ sceneEventError: new Error('ECONNRESET') });
  const s2 = createEventScheduler({ gladys: flaky, dataDir: tempDir() });
  await s2.replan(due);
  flaky.sceneEventError = null;
  await s2.replan(due);
  assert.equal(flaky.sceneEvents.length, 1, 'retried after a transient error');
  s2.stop();
});

test('aurora_alert fires on a rising level only, and remembers the level across restarts', async () => {
  const dataDir = tempDir();
  const gladys = createFakeGladys();
  const summary = (alertLevel) => ({
    alertLevel,
    kpNow: 3 + alertLevel,
    kpMax24h: 6,
    nextAlert: null,
  });
  const scheduler = createEventScheduler({ gladys, dataDir });
  for (const level of [0, 1, 1, 2, 0, 1]) {
    await scheduler.onAuroraSummary(summary(level), fmt);
  }
  assert.deepEqual(
    gladys.sceneEvents.map((e) => e.data.level),
    [1, 2, 1],
  );
  const restarted = createEventScheduler({ gladys, dataDir });
  await restarted.onAuroraSummary(summary(1), fmt);
  assert.equal(gladys.sceneEvents.length, 3, 'level 1 was already reached before the restart');
});

test('auroraEventData carries the declared variables', () => {
  const data = auroraEventData(
    {
      alertLevel: 2,
      kpNow: 5.33,
      kpMax24h: 6,
      nextAlert: { start: new Date('2026-09-21T12:00:00Z'), kp: 6 },
    },
    fmt,
  );
  assert.deepEqual(Object.keys(data).sort(), [
    'description',
    'kp',
    'kp_max_24h',
    'level',
    'next_alert',
  ]);
  assert.equal(data.next_alert, '2026-09-21T12:00:00.000Z');
});
