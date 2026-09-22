import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  DEVICE_FEATURE_UNITS,
} from '@gladysassistant/integration-sdk';
import {
  buildDiscoveredDevices,
  availableDevices,
  statesFor,
  aurora,
  SCOPES,
} from '../src/devices/index.js';
import { createEngine } from '../src/engine.js';
import { normalizeConfig } from '../src/config.js';
import { createFormatter } from '../src/formatters.js';
import { createFakeGladys } from './helpers/fakeGladys.js';
import { PARIS, d } from './helpers/paris.js';

const NOW = () => d('2026-09-20T12:00:00Z');
const CATEGORIES = new Set(Object.values(DEVICE_FEATURE_CATEGORIES));
const TYPES = new Set(Object.values(DEVICE_FEATURE_TYPES).flatMap((t) => Object.values(t)));
const UNITS = new Set(Object.values(DEVICE_FEATURE_UNITS));

async function computedSnapshot(config, { fetchImpl } = {}) {
  const engine = createEngine({
    config,
    location: PARIS,
    dataDir: mkdtempSync(path.join(tmpdir(), 'gladys-astronomy-')),
    now: NOW,
    fetchImpl: fetchImpl ?? (async () => ({ ok: false, status: 500 })),
  });
  engine.computeRare();
  engine.computeNight();
  engine.computeLive();
  if (config.aurora_enabled) {
    await engine.refreshAurora();
  }
  return engine.getSnapshot();
}

test('six devices, five without the aurora, all pushed (no Gladys polling)', () => {
  const gladys = createFakeGladys();
  const all = buildDiscoveredDevices(gladys, normalizeConfig({}));
  assert.equal(all.length, 6);
  const offline = buildDiscoveredDevices(gladys, normalizeConfig({ aurora_enabled: false }));
  assert.equal(offline.length, 5);
  assert.ok(!offline.some((dev) => dev.external_id === aurora.deviceExternalId(gladys)));
  for (const device of all) {
    assert.equal(device.should_poll, false);
    assert.equal(device.poll_frequency, undefined);
    assert.match(device.external_id, /^astronomy-[a-z]+:home$/);
    assert.ok(device.features.length >= 7);
  }
});

test('every feature is a read-only sensor with a legitimate category/type/unit', () => {
  const gladys = createFakeGladys();
  const seen = new Set();
  for (const device of buildDiscoveredDevices(gladys, normalizeConfig({}))) {
    for (const f of device.features) {
      assert.ok(!seen.has(f.external_id), `duplicate ${f.external_id}`);
      seen.add(f.external_id);
      assert.ok(f.external_id.startsWith(`${device.external_id}:`));
      assert.equal(f.read_only, true, f.external_id);
      assert.equal(f.has_feedback, false, f.external_id);
      assert.ok(CATEGORIES.has(f.category), `${f.external_id}: ${f.category}`);
      assert.ok(TYPES.has(f.type), `${f.external_id}: ${f.type}`);
      if (f.unit !== undefined) {
        assert.ok(UNITS.has(f.unit), `${f.external_id}: ${f.unit}`);
      }
      // NOT NULL columns of t_device_feature: a missing one is an HTTP 422.
      for (const column of ['min', 'max']) {
        assert.ok(Number.isFinite(f[column]), `${f.external_id}: ${column} is required`);
      }
      for (const column of ['read_only', 'has_feedback', 'keep_history']) {
        assert.equal(typeof f[column], 'boolean', `${f.external_id}: ${column}`);
      }
      if (f.type === 'text') {
        assert.deepEqual([f.min, f.max], [0, 0]);
      } else {
        assert.ok(f.min < f.max, `${f.external_id}: min/max`);
      }
      // Pairs the Gladys front cannot name show an empty chip (light-sensor/binary did).
      assert.notDeepEqual([f.category, f.type], ['light-sensor', 'binary'], f.external_id);
      assert.ok(f.name.length > 0 && f.name.length <= 40, f.name);
    }
  }
});

test('feature names follow the configured language', () => {
  const gladys = createFakeGladys();
  const fr = buildDiscoveredDevices(gladys, normalizeConfig({ language: 'fr' }));
  const en = buildDiscoveredDevices(gladys, normalizeConfig({ language: 'en' }));
  assert.equal(fr[0].name, 'Éclipses');
  assert.equal(en[0].name, 'Eclipses');
  assert.deepEqual(
    fr.map((dev) => dev.external_id),
    en.map((dev) => dev.external_id),
    'ids never depend on the language',
  );
});

test('states: every feature gets a value, texts never empty, numbers finite', async () => {
  const config = normalizeConfig({});
  const gladys = createFakeGladys();
  const snapshot = await computedSnapshot(config);
  const fmt = createFormatter('fr', 'Europe/Paris');
  const states = statesFor(gladys, snapshot, config, fmt, availableDevices(config));
  const featureIds = new Set(
    buildDiscoveredDevices(gladys, config).flatMap((dev) => dev.features.map((f) => f.external_id)),
  );
  const textIds = new Set(
    buildDiscoveredDevices(gladys, config).flatMap((dev) =>
      dev.features.filter((f) => f.type === 'text').map((f) => f.external_id),
    ),
  );
  const published = new Set(states.map((s) => s.device_feature_external_id));
  // NOAA is down and there is no cache: the aurora numbers stay unpublished.
  const expectedMissing = new Set(
    ['kp-now', 'kp-max-24h', 'kp-max-72h'].map((k) => `astronomy-aurora:home:${k}`),
  );
  for (const id of featureIds) {
    if (!expectedMissing.has(id)) {
      assert.ok(published.has(id), `no state for ${id}`);
    }
  }
  for (const s of states) {
    assert.ok(featureIds.has(s.device_feature_external_id), s.device_feature_external_id);
    if (textIds.has(s.device_feature_external_id)) {
      assert.equal(typeof s.text, 'string');
      assert.ok(s.text.length > 0);
      assert.equal(s.state, undefined);
    } else {
      assert.ok(Number.isFinite(s.state), s.device_feature_external_id);
      assert.equal(s.text, undefined);
    }
  }
  assert.ok(states.length <= 100, 'one batch is enough');
});

test('a few concrete values for Paris on 20 September 2026', async () => {
  const config = normalizeConfig({});
  const gladys = createFakeGladys();
  const snapshot = await computedSnapshot(config);
  const fmt = createFormatter('fr', 'Europe/Paris');
  const byId = Object.fromEntries(
    statesFor(gladys, snapshot, config, fmt, availableDevices(config)).map((s) => [
      s.device_feature_external_id,
      s.text ?? s.state,
    ]),
  );
  assert.match(
    byId['astronomy-eclipses:home:solar-next'],
    /^Solaire · 02\/08\/2027 · partielle 51 %/,
  );
  assert.equal(byId['astronomy-eclipses:home:solar-next-kind'], 'partial');
  assert.equal(byId['astronomy-eclipses:home:today'], 0);
  assert.match(byId['astronomy-planets:home:event-next'], /^Opposition de Saturne · 04\/10\/2026$/);
  assert.equal(byId['astronomy-planets:home:brightest'], 'jupiter');
  assert.equal(byId['astronomy-meteors:home:active'], 'Aucune pluie active');
  assert.match(byId['astronomy-meteors:home:next-peak'], /^Draconides/);
  assert.match(byId['astronomy-night:home:summary'], /^Nuit astronomique 21:40 → 05:48/);
  assert.equal(byId['astronomy-night:home:sky-score'], 0);
  assert.equal(byId['astronomy-night:home:sky-score-tonight'], 10);
  assert.equal(byId['astronomy-seasons:home:next-event-kind'], 'september-equinox');
  assert.match(
    byId['astronomy-seasons:home:next-event'],
    /^Équinoxe d’automne · 23\/09\/2026 02:05$/,
  );
  assert.equal(byId['astronomy-aurora:home:updated'], 'Indisponible');
  assert.equal(byId['astronomy-aurora:home:alert-level'], 0);
});

test('the aurora device follows the NOAA payload and reports its transport', async () => {
  const config = normalizeConfig({});
  const gladys = createFakeGladys();
  const payload = [
    ['time_tag', 'kp', 'observed', 'noaa_scale'],
    ['2026-09-20 09:00:00', '3.33', 'observed', null],
    ['2026-09-20 15:00:00', '5.67', 'predicted', 'G1'],
  ];
  const snapshot = await computedSnapshot(config, {
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => payload }),
  });
  const fmt = createFormatter('en', 'UTC');
  const byId = Object.fromEntries(
    statesFor(gladys, snapshot, config, fmt, SCOPES.aurora).map((s) => [
      s.device_feature_external_id,
      s.text ?? s.state,
    ]),
  );
  assert.equal(byId['astronomy-aurora:home:kp-now'], 3.33);
  assert.equal(byId['astronomy-aurora:home:kp-max-24h'], 5.67);
  assert.equal(byId['astronomy-aurora:home:alert-now'], 0);
  assert.equal(
    byId['astronomy-aurora:home:next-alert'],
    'Kp 5.67 forecast · 20/09/2026 15:00–18:00',
  );
  assert.equal(byId['astronomy-aurora:home:updated'], '20/09/2026 12:00 (NOAA)');
  const transport = aurora.transport(gladys, snapshot);
  assert.equal(transport.transport, 'cloud');
  assert.equal(transport.degraded, false);
});

test('SCOPES only reference available devices', () => {
  const keys = new Set(availableDevices(normalizeConfig({})).map((dev) => dev.key));
  for (const list of Object.values(SCOPES)) {
    for (const dev of list) {
      assert.ok(keys.has(dev.key));
    }
  }
});
