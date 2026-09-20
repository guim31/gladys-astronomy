// -----------------------------------------------------------------------------
// Local-time helpers.
//
// The Gladys supervisor injects `TZ` (the Gladys system timezone, UTC when the
// user never set one) into the container, so `Intl` and `Date` already speak
// the house's local time. This is the ONLY module allowed to depend on it: the
// astronomy modules (src/astro/*) receive plain `Date` objects and never format
// anything, so the same computation feeds the sensors today and the dashboard
// widgets later.
// -----------------------------------------------------------------------------

export const HOUR_MS = 3600 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/**
 * Local calendar parts of a date (year, month 1-12, day, hour, minute).
 */
export function localParts(date, timeZone = process.env.TZ || 'UTC') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

/**
 * `YYYY-MM-DD` of a date in the local timezone (the "same day" key).
 */
export function localDayKey(date, timeZone) {
  const { year, month, day } = localParts(date, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Local midnight (start of the local day) containing `date`, as a Date.
 * Works for any timezone without a tz database lookup: subtract the local
 * hour/minute, then correct the residual (DST shifts) by one more pass.
 */
export function localMidnight(date, timeZone) {
  let guess = new Date(date.getTime());
  for (let i = 0; i < 2; i += 1) {
    const { hour, minute } = localParts(guess, timeZone);
    guess = new Date(guess.getTime() - hour * HOUR_MS - minute * 60000);
    guess.setUTCSeconds(0, 0);
  }
  return guess;
}

/**
 * `HH:MM` local on the day starting at `midnight`, corrected for DST: after a
 * clock change the naive `midnight + h` lands one hour off, so the local parts
 * are read back and the difference applied (a time that does not exist that
 * day, inside a spring-forward gap, is left as is).
 */
function atLocalTime(midnight, h, m, timeZone) {
  const naive = new Date(midnight.getTime() + h * HOUR_MS + m * 60000);
  const parts = localParts(naive, timeZone);
  const diff = h * 60 + m - (parts.hour * 60 + parts.minute);
  if (diff === 0) {
    return naive;
  }
  const corrected = new Date(naive.getTime() + diff * 60000);
  const check = localParts(corrected, timeZone);
  return check.hour === h && check.minute === m ? corrected : naive;
}

/**
 * Next occurrence of a local `HH:MM` after `from` (strictly later).
 */
export function nextLocalTime(hhmm, from = new Date(), timeZone) {
  const [h, m] = hhmm.split(':').map(Number);
  let candidate = atLocalTime(localMidnight(from, timeZone), h, m, timeZone);
  if (candidate <= from) {
    const tomorrow = localMidnight(new Date(from.getTime() + DAY_MS + 2 * HOUR_MS), timeZone);
    candidate = atLocalTime(tomorrow, h, m, timeZone);
  }
  return candidate;
}
