// -----------------------------------------------------------------------------
// Where is the house?
//
// First choice: the coordinates the user set on a Gladys house, read through
// the host API (`GET /house`, granted by `location: true` in the manifest).
// Fallback: the optional latitude/longitude of the configuration. MVP: the
// first located house; multi-house support is a later lead.
// -----------------------------------------------------------------------------

import { hasLocationOverride } from './config.js';

function isCoordinate(value, max) {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max;
}

/**
 * Pick the first house with usable coordinates.
 * @param {Array<{ name?: string, selector?: string, latitude?: number, longitude?: number }>} houses
 */
export function pickHouse(houses) {
  if (!Array.isArray(houses)) {
    return null;
  }
  return (
    houses.find((h) => isCoordinate(h?.latitude, 90) && isCoordinate(h?.longitude, 180)) ?? null
  );
}

/**
 * Resolve the observer location.
 * @returns {Promise<{ latitude: number, longitude: number, elevation: number,
 *   source: 'house'|'config', houseName: string|null } | null>}
 */
export async function resolveLocation(gladys, config, { logger } = {}) {
  if (hasLocationOverride(config)) {
    return {
      latitude: config.latitude,
      longitude: config.longitude,
      elevation: config.elevation,
      source: 'config',
      houseName: null,
    };
  }
  let houses = [];
  try {
    houses = await gladys.httpClient.get('/house');
  } catch (err) {
    logger?.warn(`Cannot read the houses from Gladys: ${err.message}`);
  }
  const house = pickHouse(houses);
  if (!house) {
    return null;
  }
  return {
    latitude: house.latitude,
    longitude: house.longitude,
    elevation: config.elevation,
    source: 'house',
    houseName: house.name ?? house.selector ?? null,
  };
}
