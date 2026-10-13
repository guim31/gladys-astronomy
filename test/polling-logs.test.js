// -----------------------------------------------------------------------------
// Polling and log volume.
//
// Gladys 5.2.0 only polls a device published with `should_poll: true` AND a
// valid `poll_frequency` (GladysAssistant/Gladys#3198), and never polls a
// device already created without them. These devices are pushed by the
// container's own timers: the tests check that the core never has a reason to
// poll them, that a poll still answers harmlessly, and that the timers keep
// the states flowing without any poll.
//
// Logs: a normal cycle writes nothing at the info level, and a NOAA outage
// writes one line when it starts and one when it is over.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createFakeGladys as createSdkFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { startScheduler, NIGHT_INTERVAL_MS } from '../src/scheduler.js';
import { createEngine } from '../src/engine.js';
import { normalizeConfig } from '../src/config.js';
import { createFakeGladys } from './helpers/fakeGladys.js';
import { PARIS, d } from './helpers/paris.js';

const START = d('2026-09-20T12:00:00Z').getTime();
const MINUTE = 60 * 1000;

const NOAA_ROWS = [
  ['time_tag', 'kp', 'observed', 'noaa_scale'],
  ['2026-09-20 09:00:00', '2.00', 'observed', null],
  ['2026-09-21 09:00:00', '3.00', 'predicted', null],
];

function makeEngine(config, noaa) {
  return createEngine({
    config,
    location: PARIS,
    dataDir: mkdtempSync(path.join(tmpdir(), 'gladys-astronomy-')),
    now: () => new Date(),
    fetchImpl: async () => {
      if (noaa.down) {
        throw new Error('ENETUNREACH');
      }
      return { ok: true, status: 200, json: async () => NOAA_ROWS };
    },
  });
}

const turn = () => new Promise((r) => setImmediate(r));

/**
 * Lets the async work started by the fired timers settle: waits until the
 * engine has computed `scopes` at the (mocked) current time, then a few more
 * turns for the publication that follows. A fixed number of turns is not
 * enough when the whole suite runs in parallel.
 */
async function settle(engine, scopes = ['live']) {
  const done = () =>
    scopes.every((scope) => engine.getSnapshot().computedAt[scope]?.getTime() === Date.now());
  for (let i = 0; i < 100000 && !done(); i += 1) {
    await turn();
  }
  assert.ok(done(), `scopes ${scopes} computed`);
  for (let i = 0; i < 50; i += 1) {
    await turn();
  }
}

/** Records the SDK logger lines (info -> console.log, warn/error -> console.error). */
function captureLogs(t) {
  const lines = [];
  const record =
    (stream) =>
    (...args) =>
      lines.push({ stream, text: args.map(String).join(' ') });
  t.mock.method(console, 'log', record('out'));
  t.mock.method(console, 'error', record('err'));
  return {
    lines,
    at: (level) => lines.filter((l) => l.text.includes(`[${level}]`)),
    clear: () => lines.splice(0),
  };
}

test('the devices pass the host checks with should_poll false, and a poll stays a harmless fallback', async () => {
  const gladys = createSdkFakeGladys();
  await gladys.connect();
  const config = normalizeConfig({ refresh_minutes: 5 });
  const engine = makeEngine(config, { down: false });
  const scheduler = await startScheduler({ gladys, config, engine });
  gladys.onPoll((device) => scheduler.poll(device)); // as index.js does
  try {
    const devices = gladys.fake.discoveredDevices;
    assert.equal(devices.length, 6);
    for (const device of devices) {
      assert.equal(device.should_poll, false, device.external_id);
      assert.equal(device.poll_frequency, undefined, device.external_id);
    }
    assert.ok(!gladys.fake.requests.some((r) => r.status >= 400), 'no request refused');
    assert.ok(gladys.fake.states.length >= 50, 'the states are pushed without any poll');

    const [seasons] = devices.filter((dev) => dev.external_id.includes('seasons'));
    const before = gladys.fake.states.length;
    assert.deepEqual(await gladys.fake.poll(seasons), { success: true });
    const sent = gladys.fake.states.slice(before);
    assert.ok(sent.length > 0);
    assert.ok(sent.every((s) => s.device_feature_external_id.startsWith(seasons.external_id)));

    const unknown = await gladys.fake.poll({ ...seasons, external_id: `${seasons.external_id}-x` });
    assert.deepEqual(unknown, { success: true }, 'an unknown device is ignored, not an error');
  } finally {
    scheduler.stop();
    await gladys.disconnect();
  }
});

test('the timers keep publishing without any poll', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: START });
  const config = normalizeConfig({ refresh_minutes: 5 });
  const gladys = createFakeGladys();
  const engine = makeEngine(config, {});
  const scheduler = await startScheduler({ gladys, config, engine });
  const initial = gladys.published.length;
  t.mock.timers.tick(NIGHT_INTERVAL_MS);
  await settle(engine, ['live', 'night', 'aurora']);
  assert.ok(gladys.published.length > initial);
  scheduler.stop();
});

test('a normal cycle writes nothing at the info level', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: START });
  const logs = captureLogs(t);
  const config = normalizeConfig({ refresh_minutes: 5 });
  const gladys = createFakeGladys();
  const engine = makeEngine(config, {});
  const scheduler = await startScheduler({ gladys, config, engine });
  assert.equal(logs.at('INFO').length, 1, 'one start line (the schedule)');
  logs.clear();

  const published = gladys.published.length;
  for (let minutes = 0; minutes < 120; minutes += 5) {
    t.mock.timers.tick(5 * MINUTE);
    await settle(engine);
  }
  assert.ok(gladys.published.length > published, 'the cycles did run');
  assert.deepEqual(logs.lines, [], 'two hours of cycles: no info, no warning');
  scheduler.stop();
});

test('a NOAA outage is logged once when it starts and once when it is over', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: START });
  const logs = captureLogs(t);
  const noaa = { down: true };
  const config = normalizeConfig({ refresh_minutes: 5 });
  const gladys = createFakeGladys();
  const engine = makeEngine(config, noaa);
  const scheduler = await startScheduler({ gladys, config, engine });

  for (let i = 0; i < 4; i += 1) {
    t.mock.timers.tick(NIGHT_INTERVAL_MS);
    await settle(engine, ['live', 'aurora']);
  }
  const warnings = logs.at('WARN');
  assert.equal(warnings.length, 1, 'five failed fetches, one warning');
  assert.match(warnings[0].text, /NOAA Kp fetch failed: ENETUNREACH/);

  noaa.down = false;
  t.mock.timers.tick(NIGHT_INTERVAL_MS);
  await settle(engine, ['live', 'aurora']);
  assert.equal(logs.at('INFO').filter((l) => /NOAA Kp fetch works again/.test(l.text)).length, 1);

  logs.clear();
  t.mock.timers.tick(NIGHT_INTERVAL_MS);
  await settle(engine, ['live', 'aurora']);
  assert.deepEqual(logs.lines, [], 'nothing more once it is back');
  scheduler.stop();
});
