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
    const fr = createFormatter('fr');
    const en = createFormatter('en');
    const where = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    const source = {
      fr: location.source === 'house' ? 'maison Gladys' : 'configuration',
      en: location.source === 'house' ? 'Gladys house' : 'configuration',
    };
    return {
      fr:
        `Recalculé pour ${where} (${source.fr}).\n` +
        `${fr.solarEclipse(rare.solar)}\n${fr.lunarEclipse(rare.lunar)}\n` +
        `Prochain pic : ${fr.nextPeak(night.nextPeak)}`,
      en:
        `Recomputed for ${where} (${source.en}).\n` +
        `${en.solarEclipse(rare.solar)}\n${en.lunarEclipse(rare.lunar)}\n` +
        `Next peak: ${en.nextPeak(night.nextPeak)}`,
    };
  },

  /**
   * Fetch the NOAA forecast right now, bypassing the cache.
   */
  async test_noaa({ config, fetchImpl }) {
    const rows = await fetchKp({ fetchImpl });
    const s = summarize(rows, new Date(), { alertKp: config.aurora_kp_alert });
    const fr = createFormatter('fr');
    const en = createFormatter('en');
    return {
      fr: `NOAA joignable : ${rows.length} pas de 3 h. Kp actuel ${fr.num(s.kpNow, 2)}, max 24 h ${fr.num(s.kpMax24h, 2)}, max 72 h ${fr.num(s.kpMax72h, 2)}. ${fr.auroraNextAlert(s)}`,
      en: `NOAA reachable: ${rows.length} 3-hour steps. Current Kp ${en.num(s.kpNow, 2)}, max 24 h ${en.num(s.kpMax24h, 2)}, max 72 h ${en.num(s.kpMax72h, 2)}. ${en.auroraNextAlert(s)}`,
    };
  },
};
