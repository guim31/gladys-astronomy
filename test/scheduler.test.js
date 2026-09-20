import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { startScheduler, REPUBLISH_UNCHANGED_MS } from '../src/scheduler.js';
import { createEngine } from '../src/engine.js';
import { normalizeConfig } from '../src/config.js';
import { aurora } from '../src/devices/index.js';
import { createFakeGladys } from './helpers/fakeGladys.js';
import { PARIS, d } from './helpers/paris.js';

const START = d('2026-09-20T12:00:00Z').getTime();

function setup(t, overrides = {}, { noaaDown = false } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: START });
  const config = normalizeConfig({ refresh_minutes: 5, ...overrides });
  const gladys = createFakeGladys();
  const engine = createEngine({
    config,
    location: PARIS,
    dataDir: mkdtempSync(path.join(tmpdir(), 'gladys-astronomy-')),
    now: () => new Date(),
    fetchImpl: noaaDown
      ? async () => {
          throw new Error('ENETUNREACH');
        }
      : async () => ({
          ok: true,
          status: 200,
          json: async () => [
            ['time_tag', 'kp', 'observed', 'noaa_scale'],
            ['2026-09-20 09:00:00', '2.00', 'observed', null],
            ['2026-09-21 09:00:00', '6.00', 'predicted', null],
          ],
        }),
  });
  return { config, gladys, engine };
}

test('start publishes the devices, then every state, then schedules the ticks', async (t) => {
  const { config, gladys, engine } = setup(t);
  const scheduler = await startScheduler({ gladys, config, engine });
  assert.equal(gladys.discovered.length, 1);
  assert.equal(gladys.discovered[0].length, 6);
  const initial = gladys.published.length;
  assert.ok(initial >= 50, `${initial} states`);
  assert.equal(gladys.transports.length, 1);
  assert.equal(gladys.transports[0].degraded, false);
  for (const batch of gladys.batches) {
    assert.ok(batch.length <= 100);
  }

  // Live tick after 5 minutes: only what changed is re-sent.
  t.mock.timers.tick(5 * 60 * 1000);
  await Promise.resolve();
  await new Promise((r) => setImmediate(r));
  const afterLive = gladys.published.length;
  assert.ok(afterLive > initial, 'the live tick published something');
  assert.ok(afterLive - initial < 15, `only the changed values (${afterLive - initial})`);

  // Past the re-publication window, unchanged values go out again.
  t.mock.timers.tick(REPUBLISH_UNCHANGED_MS);
  await new Promise((r) => setImmediate(r));
  assert.ok(gladys.published.length - afterLive >= 30);
  scheduler.stop();
});

test('poll(device) answers with the states of that device only', async (t) => {
  const { config, gladys, engine } = setup(t);
  const scheduler = await startScheduler({ gladys, config, engine });
  const before = gladys.published.length;
  await scheduler.poll({ external_id: 'astronomy-seasons:home' });
  const sent = gladys.published.slice(before);
  assert.equal(sent.length, 8);
  assert.ok(sent.every((s) => s.featureExternalId.startsWith('astronomy-seasons:home:')));
  const warnBefore = gladys.published.length;
  await scheduler.poll({ external_id: 'nope' });
  assert.equal(gladys.published.length, warnBefore);
  scheduler.stop();
});

test('a NOAA outage degrades the aurora device and never touches the connection status', async (t) => {
  const { config, gladys, engine } = setup(t, {}, { noaaDown: true });
  const scheduler = await startScheduler({ gladys, config, engine });
  assert.equal(gladys.connectionStatuses.length, 0);
  assert.equal(gladys.transports.at(-1).degraded, true);
  assert.equal(gladys.transports.at(-1).external_id, aurora.deviceExternalId(gladys));
  const updated = gladys.published.find(
    (s) => s.featureExternalId === 'astronomy-aurora:home:updated',
  );
  assert.equal(updated.text, 'Indisponible');
  scheduler.stop();
});

test('with the aurora off, no NOAA call and five devices', async (t) => {
  const { config, gladys, engine } = setup(t, { aurora_enabled: false }, { noaaDown: true });
  const scheduler = await startScheduler({ gladys, config, engine });
  assert.equal(gladys.discovered[0].length, 5);
  assert.equal(gladys.transports.length, 0);
  assert.ok(!gladys.published.some((s) => s.featureExternalId.startsWith('astronomy-aurora')));
  scheduler.stop();
});

test('recompute re-sends everything', async (t) => {
  const { config, gladys, engine } = setup(t);
  const scheduler = await startScheduler({ gladys, config, engine });
  const before = gladys.published.length;
  await scheduler.recompute();
  assert.ok(gladys.published.length - before >= 50);
  scheduler.stop();
});
