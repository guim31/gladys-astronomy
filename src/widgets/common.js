// Shared helpers of the widget builders.
import { createFormatter } from '../formatters.js';
import { strings } from './i18n.js';
import { localMidnight } from '../time.js';

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

/**
 * Whole calendar days between today and the local day of `time` (0 = today,
 * 1 = tomorrow), whatever the hour: an event at 02:05 tomorrow is "tomorrow",
 * not "today" because it is less than 24 h away.
 */
export function calendarDays(time, now) {
  return Math.max(0, Math.round((localMidnight(time) - localMidnight(now)) / DAY_MS));
}

/** Color of an "in N days" badge. */
export function urgency(time, now) {
  const days = calendarDays(time, now);
  if (days <= 1) {
    return 'danger';
  }
  return days <= 7 ? 'warning' : 'info';
}

export function iso(date) {
  return date instanceof Date ? date.toISOString() : date;
}
