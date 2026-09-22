// Widget "Sky agenda": the next events of every kind, as a list of cards.
import { buildAgenda, CATEGORIES } from '../agenda.js';
import { localize, message, urgency, calendarDays, iso } from './common.js';

export const KEY = 'astro_agenda';

export const HORIZONS = ['30', '90', '365'];

function readCategories(raw) {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' && raw ? raw.split(',') : [];
  return list.map((c) => String(c).trim()).filter((c) => CATEGORIES.includes(c));
}

export function build(snapshot, { settings = {}, language, now }) {
  const { fmt, s } = localize(language);
  if (!snapshot?.rare || !snapshot?.night) {
    return message(s.noLocation);
  }
  const horizonDays = HORIZONS.includes(String(settings.horizon_days))
    ? Number(settings.horizon_days)
    : 90;
  const events = buildAgenda(snapshot, {
    fmt,
    now,
    categories: readCategories(settings.categories),
    horizonDays,
  });
  if (events.length === 0) {
    return message(s.agendaEmpty, 3600);
  }
  return {
    version: 1,
    ttl_seconds: 3600,
    components: [
      { type: 'text', variant: 'caption', text: s.agendaCaption(events.length, horizonDays) },
      {
        type: 'card-list',
        display: 'list',
        items: events.slice(0, 8).map((e) => ({
          title: e.title,
          subtitle: e.subtitle,
          date: iso(e.time),
          badge: { text: s.inDays(calendarDays(e.time, now)), color: urgency(e.time, now) },
          description: e.details,
        })),
      },
    ],
  };
}
