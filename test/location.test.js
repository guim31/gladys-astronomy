import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickHouse, resolveLocation } from '../src/location.js';
import { normalizeConfig } from '../src/config.js';
import { createFakeGladys } from './helpers/fakeGladys.js';

test('pickHouse takes the first house with real coordinates', () => {
  assert.equal(pickHouse([]), null);
  assert.equal(pickHouse([{ name: 'A', latitude: null, longitude: null }]), null);
  const house = pickHouse([
    { name: 'A', latitude: null, longitude: 2 },
    { name: 'B', latitude: 48.8, longitude: 2.3 },
    { name: 'C', latitude: 43, longitude: 1 },
  ]);
  assert.equal(house.name, 'B');
  assert.equal(pickHouse('nope'), null);
});

test('resolveLocation prefers the config override, else the Gladys house', async () => {
  const gladys = createFakeGladys({ houses: [{ name: 'Maison', latitude: 48.8, longitude: 2.3 }] });
  const fromHouse = await resolveLocation(gladys, normalizeConfig({ elevation: 120 }));
  assert.deepEqual(fromHouse, {
    latitude: 48.8,
    longitude: 2.3,
    elevation: 120,
    source: 'house',
    houseName: 'Maison',
  });
  assert.deepEqual(gladys.httpCalls, ['/house']);

  const fromConfig = await resolveLocation(gladys, normalizeConfig({ latitude: 43, longitude: 1 }));
  assert.equal(fromConfig.source, 'config');
  assert.equal(fromConfig.latitude, 43);
  assert.deepEqual(gladys.httpCalls, ['/house'], 'no request when overridden');
});

test('resolveLocation returns null when nothing is usable, even on a host error', async () => {
  const warnings = [];
  const logger = { warn: (m) => warnings.push(m) };
  const failing = createFakeGladys({ houses: new Error('403') });
  assert.equal(await resolveLocation(failing, normalizeConfig(), { logger }), null);
  assert.equal(warnings.length, 1);
  const empty = createFakeGladys({ houses: [{ name: 'A' }] });
  assert.equal(await resolveLocation(empty, normalizeConfig()), null);
});
