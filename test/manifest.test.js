// -----------------------------------------------------------------------------
// Consistency checks between `gladys-assistant-integration.json` and the code.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ACTIONS } from '../src/actions.js';
import { DEFAULT_CONFIG, LIMITS, LANGUAGES, normalizeConfig } from '../src/config.js';
import { WIDGETS } from '../src/widgets/index.js';
import { SCENE_ACTIONS } from '../src/scene-actions.js';
import { planEvents, auroraEventData, TRIGGER_KEYS } from '../src/scene-events.js';
import { createFormatter } from '../src/formatters.js';
import { computedSnapshot } from './helpers/snapshot.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('every manifest action has a registered handler, and vice versa', () => {
  const declared = new Set((manifest.actions ?? []).map((a) => a.key));
  const handled = new Set(Object.keys(ACTIONS));
  assert.deepEqual([...declared].sort(), [...handled].sort());
});

test('manifest version stays in lockstep with package.json and the image tag', () => {
  assert.equal(manifest.version, pkg.version);
  assert.ok(manifest.docker_image.endsWith(`:${manifest.version}`));
});

test('widgets and scene declarations require Gladys >= 5.1.0', () => {
  assert.ok(manifest.categories.length >= 1 && manifest.categories.length <= 3);
  const minVersion = manifest.gladys_version.match(/>=\s*(\d+)\.(\d+)\.\d+/);
  assert.ok(minVersion);
  const [, major, minor] = minVersion.map(Number);
  assert.ok(major > 5 || (major === 5 && minor >= 1));
});

test('every declared widget has a builder, and vice versa', () => {
  assert.deepEqual(manifest.widgets.map((w) => w.key).sort(), Object.keys(WIDGETS).sort());
  assert.ok(manifest.widgets.length <= 5);
  for (const w of manifest.widgets) {
    for (const label of Object.values(w.label)) {
      assert.ok(label.length >= 3 && label.length <= 30, label);
    }
    for (const text of Object.values(w.description ?? {})) {
      assert.ok(text.length <= 100, text);
    }
  }
});

test('every declared scene action has a handler whose outputs are declared', async () => {
  assert.deepEqual(
    manifest.scene_actions.map((a) => a.key).sort(),
    Object.keys(SCENE_ACTIONS).sort(),
  );
  const { snapshot, config, now } = await computedSnapshot('2026-09-20T10:00:00Z');
  for (const action of manifest.scene_actions) {
    const declared = new Set(action.outputs.map((o) => o.key));
    const outputs = await SCENE_ACTIONS[action.key]({}, { snapshot, config, now });
    for (const key of Object.keys(outputs)) {
      assert.ok(declared.has(key), `${action.key} returns undeclared "${key}"`);
    }
    assert.deepEqual([...declared].sort(), Object.keys(outputs).sort(), action.key);
  }
});

test('every scene trigger is emitted by the code, with declared data keys only', async () => {
  assert.deepEqual(manifest.scene_triggers.map((tr) => tr.key).sort(), [...TRIGGER_KEYS].sort());
  const fmt = createFormatter('fr', 'Europe/Paris');
  // New Moon on the 12th: the night of the 10th has a moonless window.
  const { snapshot } = await computedSnapshot('2026-08-10T10:00:00Z');
  const emitted = planEvents(snapshot, { fmt });
  emitted.push({
    key: 'aurora_alert',
    data: auroraEventData({ alertLevel: 1, kpNow: 4.3, kpMax24h: 5, nextAlert: null }, fmt),
  });
  const seen = new Set();
  for (const event of emitted) {
    const declaration = manifest.scene_triggers.find((tr) => tr.key === event.key);
    const allowed = new Set([
      ...(declaration.variables ?? []).map((v) => v.key),
      ...(declaration.fields ?? []).map((f) => f.key),
    ]);
    for (const key of Object.keys(event.data)) {
      assert.ok(allowed.has(key), `${event.key} emits undeclared "${key}"`);
    }
    for (const variable of declaration.variables ?? []) {
      assert.ok(variable.key in event.data, `${event.key} never sets "${variable.key}"`);
    }
    for (const field of declaration.fields ?? []) {
      assert.ok(field.key in event.data, `${event.key} cannot match on "${field.key}"`);
    }
    seen.add(event.key);
  }
  assert.deepEqual([...seen].sort(), [...TRIGGER_KEYS].sort(), 'every trigger is exercised');
});

test('the house coordinates are requested, descriptions fit the store limit', () => {
  assert.equal(manifest.location, true);
  for (const [lang, text] of Object.entries(manifest.description)) {
    assert.ok(text.length >= 10 && text.length <= 100, `${lang} description: ${text.length} chars`);
  }
});

test('config_schema defaults and bounds stay consistent with the code', () => {
  for (const field of manifest.config_schema) {
    if (field.default !== undefined) {
      assert.equal(DEFAULT_CONFIG[field.key], field.default, `default of ${field.key}`);
    }
    if (field.type === 'number') {
      assert.deepEqual(
        LIMITS[field.key],
        { min: field.min, max: field.max },
        `bounds of ${field.key}`,
      );
    }
  }
  const language = manifest.config_schema.find((f) => f.key === 'language');
  assert.deepEqual(
    language.options.map((o) => o.value),
    LANGUAGES,
  );
});

test('every value-bearing config_schema field is normalized by the code', () => {
  const normalized = normalizeConfig({});
  for (const field of manifest.config_schema) {
    if (field.type === 'section') {
      continue;
    }
    assert.ok(field.key in normalized, `normalizeConfig ignores "${field.key}"`);
  }
});
