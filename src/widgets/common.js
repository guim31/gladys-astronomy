// Shared helpers of the widget builders.
import { createFormatter } from '../formatters.js';
import { strings } from './i18n.js';

const DAY_MS = 24 * 3600 * 1000;

/** Formatter and strings in the language of the user viewing the widget. */
export function localize(language) {
  const fmt = createFormatter(language, process.env.TZ || 'UTC', { fallback: 'en' });
  return { fmt, s: strings(fmt.language) };
}

/** Content shown while there is nothing to compute (no location, feature off). */
export function message(text, ttlSeconds = 300) {
  return {
    version: 1,
    ttl_seconds: ttlSeconds,
    components: [{ type: 'text', variant: 'body', text }],
  };
}

/** Color of an "in N days" badge. */
export function urgency(time, now) {
  const days = (time - now) / DAY_MS;
  if (days <= 1) {
    return 'danger';
  }
  return days <= 7 ? 'warning' : 'info';
}

export function daysBetween(time, now) {
  return Math.max(0, (time - now) / DAY_MS);
}

export function iso(date) {
  return date instanceof Date ? date.toISOString() : date;
}
