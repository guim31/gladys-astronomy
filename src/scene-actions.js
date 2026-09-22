// -----------------------------------------------------------------------------
// Scene actions (Gladys 5.1): answers a scene can read in its next steps.
//
// A scene action receives no user language: each declares a `language` field.
// Outputs are scalars only (the core drops anything else).
// -----------------------------------------------------------------------------

import { buildAgenda, CATEGORIES } from './agenda.js';
import { createFormatter } from './formatters.js';

export const NO_LOCATION = 'astronomy: no location yet (locate the house in Gladys)';

const DAY_MS = 24 * 3600 * 1000;

function formatterFor(fields, config) {
  const language = ['fr', 'en'].includes(fields?.language) ? fields.language : config.language;
  return createFormatter(language);
}

export const SCENE_ACTIONS = {
  /**
   * The next event of the sky agenda, optionally of one category.
   */
  next_event(fields, { snapshot, config, now = new Date() }) {
    if (!snapshot?.rare || !snapshot?.night) {
      throw new Error(NO_LOCATION);
    }
    const fmt = formatterFor(fields, config);
    const category = CATEGORIES.includes(fields?.category) ? fields.category : null;
    const [event] = buildAgenda(snapshot, {
      fmt,
      now,
      categories: category ? [category] : [],
      horizonDays: 3660,
    });
    if (!event) {
      return { found: false };
    }
    const ms = event.time - now;
    return {
      found: true,
      category: event.category,
      title: event.title,
      time: event.time.toISOString(),
      local_time: fmt.dateTime(event.time),
      days_until: Math.floor(ms / DAY_MS),
      minutes_until: Math.round(ms / 60000),
      visible: event.visible !== false,
      description: event.details,
    };
  },

  /**
   * Tonight in one call: summary sentence and the numbers behind it.
   */
  tonight_summary(fields, { snapshot, config }) {
    const { night, live } = snapshot ?? {};
    if (!night || !live) {
      throw new Error(NO_LOCATION);
    }
    const fmt = formatterFor(fields, config);
    const moonless = night.moonless;
    return {
      summary: fmt.nightSummary(night),
      best_score: night.night ? night.bestScore : 0,
      sky_score_now: live.skyScore,
      dark_start: moonless ? fmt.time(moonless.start) : '',
      dark_end: moonless ? fmt.time(moonless.end) : '',
      dark_minutes: moonless ? moonless.minutes : 0,
      planets: fmt.planets(night.planets),
      moon_illumination: Math.round(live.moonIllumination),
      active_shower: night.activeShowers?.[0] ? fmt.activeShower(night.activeShowers[0]) : '',
    };
  },
};
