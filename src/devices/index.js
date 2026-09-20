// -----------------------------------------------------------------------------
// Device registry: six virtual devices, one per theme, all bound to the house
// (`platformId = 'home'`; multi-house support would add `house-<selector>`).
// -----------------------------------------------------------------------------

import { eclipses } from './eclipses.js';
import { planets } from './planets.js';
import { meteors } from './meteors.js';
import { night } from './night.js';
import { seasons } from './seasons.js';
import { aurora } from './aurora.js';

export { eclipses, planets, meteors, night, seasons, aurora };

/** Devices in publication order. */
export function availableDevices(config) {
  const list = [eclipses, planets, meteors, night, seasons];
  if (aurora.isAvailable(config)) {
    list.push(aurora);
  }
  return list;
}

/** Which devices each computation scope refreshes. */
export const SCOPES = {
  rare: [eclipses, planets, seasons],
  night: [planets, meteors, night],
  live: [eclipses, planets, meteors, night, seasons],
  aurora: [aurora],
};

/**
 * Build the discovery payload for Gladys.
 */
export function buildDiscoveredDevices(gladys, config) {
  return availableDevices(config).map((d) => d.buildDevice(gladys, config));
}

/**
 * States of the devices of one scope (or of an explicit device list).
 */
export function statesFor(gladys, snapshot, config, fmt, devices) {
  const enabled = new Set(availableDevices(config).map((d) => d.key));
  const states = [];
  for (const device of devices) {
    if (enabled.has(device.key)) {
      states.push(...device.states(gladys, snapshot, fmt));
    }
  }
  return states;
}
