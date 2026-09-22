// -----------------------------------------------------------------------------
// The sky agenda: every upcoming event of the snapshot in one chronological
// list. Feeds the "Sky agenda" widget and the `next_event` scene action.
//
// Pure: reads the snapshot, formats through the formatter it is given.
// -----------------------------------------------------------------------------

import { strings } from './widgets/i18n.js';

export const CATEGORIES = ['eclipses', 'meteors', 'conjunctions', 'planets', 'seasons', 'transits'];

const DAY_MS = 24 * 3600 * 1000;

/**
 * @param {object} snapshot engine snapshot (rare + night computed)
 * @param {object} options
 * @param {ReturnType<import('./formatters.js').createFormatter>} options.fmt
 * @param {Date} options.now
 * @param {string[]} [options.categories] subset of CATEGORIES, all when empty
 * @param {number} [options.horizonDays]
 * @returns {Array<{ category: string, id: string, time: Date, title: string,
 *   subtitle: string, details: string, visible: boolean|null }>}
 */
export function buildAgenda(snapshot, { fmt, now, categories = [], horizonDays = 90 }) {
  const { rare, night } = snapshot;
  if (!rare || !night) {
    return [];
  }
  const s = strings(fmt.language);
  const wanted = new Set(categories.length ? categories : CATEGORIES);
  const limit = new Date(now.getTime() + horizonDays * DAY_MS);
  const events = [];
  const add = (category, id, time, title, details, visible = true) => {
    if (!time || time <= now || time > limit || !wanted.has(category)) {
      return;
    }
    // `visible: null` for what is not observed (a season, an apsis).
    const vis = visible === null ? '' : ` · ${visible ? s.visible : s.notVisible}`;
    events.push({
      category,
      id,
      time,
      title,
      subtitle: `${fmt.dateTime(time)}${vis}`,
      details,
      visible,
    });
  };

  const { solar, lunar, transit, season, apsis } = rare;
  if (solar) {
    add(
      'eclipses',
      `solar-${solar.peak.toISOString()}`,
      solar.partialBegin,
      s.solarEclipse(fmt.t.kind[solar.kind]),
      fmt.solarEclipse(solar),
    );
  }
  if (lunar) {
    add(
      'eclipses',
      `lunar-${lunar.peak.toISOString()}`,
      lunar.begin,
      s.lunarEclipse(fmt.t.kind[lunar.kind]),
      fmt.lunarEclipse(lunar),
    );
  }
  if (transit) {
    add(
      'transits',
      `transit-${transit.peak.toISOString()}`,
      transit.start,
      `${fmt.t.transit} ${fmt.body(transit.body)}`,
      fmt.transit(transit),
      transit.visible,
    );
  }
  for (const shower of night.upcomingPeaks ?? []) {
    add(
      'meteors',
      `meteors-${shower.code}-${shower.year}`,
      shower.peak,
      s.meteorPeak(fmt.showerName(shower)),
      fmt.nextPeak(shower),
    );
  }
  for (const c of rare.conjunctions ?? []) {
    add(
      'conjunctions',
      `conjunction-${c.bodies.join('-')}-${c.time.toISOString()}`,
      c.time,
      `${fmt.body(c.bodies[0])} – ${fmt.body(c.bodies[1])} (${fmt.num(c.separation, 1)}°)`,
      fmt.conjunction(c),
      c.visible,
    );
  }
  for (const e of rare.planetEvents ?? []) {
    const title =
      e.kind === 'opposition'
        ? `${fmt.t.opposition} ${fmt.body(e.body)}`
        : `${fmt.t.elongation} ${fmt.body(e.body)}`;
    add(
      'planets',
      `${e.kind}-${e.body}-${e.time.toISOString()}`,
      e.time,
      title,
      fmt.planetEvent(e),
    );
  }
  if (season) {
    add(
      'seasons',
      `season-${season.kind}-${season.time.toISOString()}`,
      season.time,
      fmt.t.season[season.kind],
      fmt.season(season),
      null,
    );
  }
  if (apsis) {
    add(
      'seasons',
      `apsis-${apsis.kind}-${apsis.time.toISOString()}`,
      apsis.time,
      fmt.t.apsis[apsis.kind],
      fmt.apsis(apsis),
      null,
    );
  }
  return events.sort((a, b) => a.time - b.time);
}
