// -----------------------------------------------------------------------------
// Building blocks shared by the six virtual devices.
//
// Every device is published with `should_poll: false`: Gladys polling only
// accepts a handful of sub-minute frequencies, while these sensors change on
// minute-to-day scales, so the scheduler pushes the states itself. All
// features are read-only sensors.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  DEVICE_FEATURE_UNITS,
} from '@gladysassistant/integration-sdk';

export const PLATFORM_ID = 'home';

const { TEXT, DURATION, LIGHT_SENSOR, COUNTER_SENSOR, ANGLE_SENSOR, DISTANCE_SENSOR, RISK, INPUT } =
  DEVICE_FEATURE_CATEGORIES;

export const UNITS = DEVICE_FEATURE_UNITS;

/** Names of the features in each supported language. */
export function pick(names, language) {
  return names[language] ?? names.en;
}

function base(ids, key, name, category, type, extra = {}) {
  return {
    name,
    external_id: ids.feature(key),
    category,
    type,
    read_only: true,
    has_feedback: false,
    keep_history: false,
    ...extra,
  };
}

/**
 * A free-text sensor (no history, never expires on the dashboard). `min` and
 * `max` mean nothing for a text, but the core stores them in NOT NULL columns
 * and refuses the device without them (HTTP 422): 0/0, as Zigbee2MQTT does.
 */
export function text(ids, key, name) {
  return base(ids, key, name, TEXT, DEVICE_FEATURE_TYPES.TEXT.TEXT, { min: 0, max: 0 });
}

/** A countdown or a duration. */
export function duration(ids, key, name, unit, max, { decimal = false, history = false } = {}) {
  return base(
    ids,
    key,
    name,
    DURATION,
    decimal ? DEVICE_FEATURE_TYPES.DURATION.DECIMAL : DEVICE_FEATURE_TYPES.DURATION.INTEGER,
    { unit, min: 0, max, keep_history: history },
  );
}

/** A percentage, a score, an index (0-100 by default). */
export function level(ids, key, name, { unit, min = 0, max = 100, history = true } = {}) {
  return base(ids, key, name, LIGHT_SENSOR, DEVICE_FEATURE_TYPES.SENSOR.DECIMAL, {
    ...(unit ? { unit } : {}),
    min,
    max,
    keep_history: history,
  });
}

/**
 * A 0/1 flag. `input/binary` is the neutral binary of the core: labelled in
 * the UI ("État de l'entrée") and rendered as an On/Off badge. The first
 * choice, `light-sensor/binary`, has no label in the Gladys front, which
 * showed an empty chip in the Discovery screen.
 */
export function flag(ids, key, name, { history = false } = {}) {
  return base(ids, key, name, INPUT, DEVICE_FEATURE_TYPES.INPUT.BINARY, {
    min: 0,
    max: 1,
    keep_history: history,
  });
}

/** A count. */
export function counter(ids, key, name, max) {
  return base(ids, key, name, COUNTER_SENSOR, DEVICE_FEATURE_TYPES.SENSOR.INTEGER, {
    min: 0,
    max,
  });
}

/** An angle in degrees. */
export function angle(ids, key, name, max) {
  return base(ids, key, name, ANGLE_SENSOR, DEVICE_FEATURE_TYPES.SENSOR.INTEGER, {
    unit: UNITS.DEGREE,
    min: 0,
    max,
  });
}

/** A distance in km. */
export function distance(ids, key, name, min, max) {
  return base(ids, key, name, DISTANCE_SENSOR, DEVICE_FEATURE_TYPES.SENSOR.DECIMAL, {
    unit: UNITS.KM,
    min,
    max,
    keep_history: true,
  });
}

/** A 0-3 risk level (badge on the dashboard). */
export function risk(ids, key, name) {
  return base(ids, key, name, RISK, DEVICE_FEATURE_TYPES.RISK.INTEGER, { min: 0, max: 3 });
}

/**
 * Build a list of states, skipping non-finite numbers and empty texts.
 * @param {Array<[string, number|string|null|undefined]>} pairs [featureExternalId, value]
 */
export function toStates(pairs) {
  const states = [];
  for (const [id, value] of pairs) {
    if (typeof value === 'string') {
      if (value.length > 0) {
        states.push({ device_feature_external_id: id, text: value });
      }
    } else if (typeof value === 'boolean') {
      states.push({ device_feature_external_id: id, state: value ? 1 : 0 });
    } else if (Number.isFinite(value)) {
      states.push({ device_feature_external_id: id, state: value });
    }
  }
  return states;
}

export function round(value, decimals = 1) {
  if (!Number.isFinite(value)) {
    return null;
  }
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
