// -----------------------------------------------------------------------------
// Integration configuration.
//
// Filled in by the user in Gladys from the `config_schema` of
// `gladys-assistant-integration.json`; the SDK fetches it (`gladys.getConfig()`)
// and pushes every change through `gladys.onConfigUpdated()`. This module only
// provides defaults and normalizes the received object so the rest of the code
// never deals with `undefined` or with numbers that arrived as strings.
// -----------------------------------------------------------------------------

// Defaults: they MUST stay consistent with the `default` values declared in the
// `config_schema` of the manifest (a test enforces it).
export const DEFAULT_CONFIG = {
  language: 'fr', // language of the text sensors
  refresh_minutes: 5, // cadence of the countdown / instantaneous sensors
  conjunction_lookahead_days: 90, // how far ahead conjunctions are searched
  conjunction_max_separation: 3, // degrees: closer than this is a conjunction
  meteor_min_zhr: 10, // showers below this rate are ignored
  moon_max_illumination: 30, // percent: the Moon is "quiet" below this
  bortle: 0, // 1-9 light pollution class, 0 = ignored
  aurora_enabled: true, // publish the NOAA aurora device
  aurora_kp_alert: 5, // Kp threshold of the aurora alert
  latitude: null, // optional override of the house coordinates
  longitude: null,
  elevation: 0, // meters
};

export const LANGUAGES = ['fr', 'en'];

// Bounds of the numeric fields, shared with the manifest (`min`/`max`).
export const LIMITS = {
  refresh_minutes: { min: 1, max: 30 },
  conjunction_lookahead_days: { min: 14, max: 180 },
  conjunction_max_separation: { min: 0.5, max: 10 },
  meteor_min_zhr: { min: 0, max: 150 },
  moon_max_illumination: { min: 0, max: 100 },
  bortle: { min: 0, max: 9 },
  aurora_kp_alert: { min: 3, max: 9 },
  latitude: { min: -90, max: 90 },
  longitude: { min: -180, max: 180 },
  elevation: { min: 0, max: 5000 },
};

/**
 * Clamp a numeric field coming from the form (may arrive as a string).
 */
function toNumber(raw, fallback, { min, max }) {
  if (raw === null || raw === undefined || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

/**
 * Anything but an explicit false means true.
 */
function toBoolean(raw, fallback) {
  if (raw === null || raw === undefined || raw === '') {
    return fallback;
  }
  return raw !== false && raw !== 'false';
}

/**
 * Optional coordinate: null when left empty.
 */
function toOptionalNumber(raw, limits) {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(limits.max, Math.max(limits.min, value)) : null;
}

/**
 * Merge the user config with the defaults.
 * @param {Record<string, unknown>} raw config returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const language = String(raw.language ?? DEFAULT_CONFIG.language).toLowerCase();
  const number = (key) => toNumber(raw[key], DEFAULT_CONFIG[key], LIMITS[key]);
  return {
    language: LANGUAGES.includes(language) ? language : DEFAULT_CONFIG.language,
    refresh_minutes: number('refresh_minutes'),
    conjunction_lookahead_days: number('conjunction_lookahead_days'),
    conjunction_max_separation: number('conjunction_max_separation'),
    meteor_min_zhr: number('meteor_min_zhr'),
    moon_max_illumination: number('moon_max_illumination'),
    bortle: number('bortle'),
    aurora_enabled: toBoolean(raw.aurora_enabled, DEFAULT_CONFIG.aurora_enabled),
    aurora_kp_alert: number('aurora_kp_alert'),
    latitude: toOptionalNumber(raw.latitude, LIMITS.latitude),
    longitude: toOptionalNumber(raw.longitude, LIMITS.longitude),
    elevation: number('elevation'),
  };
}

/**
 * True when the user typed both coordinates by hand.
 */
export function hasLocationOverride(config) {
  return config.latitude !== null && config.longitude !== null;
}
