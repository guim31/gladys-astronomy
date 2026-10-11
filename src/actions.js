// -----------------------------------------------------------------------------
// Manifest actions: the buttons of the Configuration screen.
//
// Keyed by the `key` declared in the `actions` array of the manifest (a test
// keeps both in sync). Each handler resolves a multi-language message shown
// under the button.
// -----------------------------------------------------------------------------

import { fetchKp, summarize } from './aurora/noaa.js';
import { createFormatter } from './formatters.js';
import { MESSAGES } from './scheduler.js';
import { LANGUAGES } from './config.js';

// Sentences around the formatted values, per language of the Gladys UI.
export const TEXTS = {
  fr: {
    house: 'maison Gladys',
    config: 'configuration',
    recomputed: (where, source) => `Recalculé pour ${where} (${source}).`,
    nextPeak: 'Prochain pic :',
    noaa: (steps, f, s) =>
      `NOAA joignable : ${steps} pas de 3 h. Kp actuel ${f.num(s.kpNow, 2)}, max 24 h ${f.num(s.kpMax24h, 2)}, max 72 h ${f.num(s.kpMax72h, 2)}.`,
  },
  en: {
    house: 'Gladys house',
    config: 'configuration',
    recomputed: (where, source) => `Recomputed for ${where} (${source}).`,
    nextPeak: 'Next peak:',
    noaa: (steps, f, s) =>
      `NOAA reachable: ${steps} 3-hour steps. Current Kp ${f.num(s.kpNow, 2)}, max 24 h ${f.num(s.kpMax24h, 2)}, max 72 h ${f.num(s.kpMax72h, 2)}.`,
  },
  de: {
    house: 'Gladys-Zuhause',
    config: 'Konfiguration',
    recomputed: (where, source) => `Neu berechnet für ${where} (${source}).`,
    nextPeak: 'Nächstes Maximum:',
    noaa: (steps, f, s) =>
      `NOAA erreichbar: ${steps} Schritte zu 3 h. Aktueller Kp ${f.num(s.kpNow, 2)}, max. 24 h ${f.num(s.kpMax24h, 2)}, max. 72 h ${f.num(s.kpMax72h, 2)}.`,
  },
  es: {
    house: 'vivienda de Gladys',
    config: 'configuración',
    recomputed: (where, source) => `Recalculado para ${where} (${source}).`,
    nextPeak: 'Próximo máximo:',
    noaa: (steps, f, s) =>
      `NOAA accesible: ${steps} intervalos de 3 h. Kp actual ${f.num(s.kpNow, 2)}, máx. 24 h ${f.num(s.kpMax24h, 2)}, máx. 72 h ${f.num(s.kpMax72h, 2)}.`,
  },
};

/** One message per language, built from the formatter of that language. */
function inEveryLanguage(build) {
  return Object.fromEntries(
    LANGUAGES.map((lang) => [lang, build(TEXTS[lang], createFormatter(lang))]),
  );
}

export const ACTIONS = {
  /**
   * Recompute everything now and publish every state, then describe what
   * was found.
   */
  async recompute_now({ scheduler, engine, location }) {
    if (!scheduler || !engine || !location) {
      return MESSAGES.noLocation;
    }
    await scheduler.recompute();
    const { rare, night } = engine.getSnapshot();
    const where = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    return inEveryLanguage(
      (t, f) =>
        `${t.recomputed(where, location.source === 'house' ? t.house : t.config)}\n` +
        `${f.solarEclipse(rare.solar)}\n${f.lunarEclipse(rare.lunar)}\n` +
        `${t.nextPeak} ${f.nextPeak(night.nextPeak)}`,
    );
  },

  /**
   * Fetch the NOAA forecast right now, bypassing the cache.
   */
  async test_noaa({ config, fetchImpl }) {
    const rows = await fetchKp({ fetchImpl });
    const s = summarize(rows, new Date(), { alertKp: config.aurora_kp_alert });
    return inEveryLanguage((t, f) => `${t.noaa(rows.length, f, s)} ${f.auroraNextAlert(s)}`);
  },
};
