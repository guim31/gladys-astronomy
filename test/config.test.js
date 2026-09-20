import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, LIMITS, hasLocationOverride, normalizeConfig } from '../src/config.js';

test('normalizeConfig returns the defaults for an empty config', () => {
  assert.deepEqual(normalizeConfig(), DEFAULT_CONFIG);
  assert.deepEqual(normalizeConfig({}), DEFAULT_CONFIG);
});

test('numbers arriving as strings are parsed and clamped', () => {
  const config = normalizeConfig({ refresh_minutes: '10', bortle: '99' });
  assert.equal(config.refresh_minutes, 10);
  assert.equal(config.bortle, LIMITS.bortle.max);
  assert.equal(normalizeConfig({ refresh_minutes: 0 }).refresh_minutes, LIMITS.refresh_minutes.min);
  assert.equal(
    normalizeConfig({ meteor_min_zhr: 'abc' }).meteor_min_zhr,
    DEFAULT_CONFIG.meteor_min_zhr,
  );
});

test('language falls back to French on anything unknown', () => {
  assert.equal(normalizeConfig({ language: 'EN' }).language, 'en');
  assert.equal(normalizeConfig({ language: 'de' }).language, 'fr');
});

test('booleans accept the string form sent by some forms', () => {
  assert.equal(normalizeConfig({ aurora_enabled: 'false' }).aurora_enabled, false);
  assert.equal(normalizeConfig({ aurora_enabled: false }).aurora_enabled, false);
  assert.equal(normalizeConfig({ aurora_enabled: null }).aurora_enabled, true);
});

test('the location override needs both coordinates', () => {
  assert.equal(hasLocationOverride(normalizeConfig({ latitude: '48.8' })), false);
  const both = normalizeConfig({ latitude: '48.8', longitude: '2.3', elevation: '' });
  assert.equal(hasLocationOverride(both), true);
  assert.equal(both.elevation, 0);
  assert.equal(normalizeConfig({ latitude: 'x', longitude: 2 }).latitude, null);
  assert.equal(normalizeConfig({ latitude: 95, longitude: 2 }).latitude, 90);
});
