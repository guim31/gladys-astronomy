// -----------------------------------------------------------------------------
// Aurora outlook from the NOAA Space Weather Prediction Center: the planetary
// Kp index, observed and forecast, in 3-hour steps for about ten days.
//
// The endpoint needs no key. Its format is not contractual: the JSON is an
// array whose first row may be a header (`["time_tag","kp","observed",
// "noaa_scale"]`) and `kp` may arrive as a string. This is the only network
// module of the integration.
// -----------------------------------------------------------------------------

export const NOAA_KP_URL =
  'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';

const USER_AGENT = 'gladys-astronomy (+https://github.com/guim31/gladys-astronomy)';
const HOUR_MS = 3600 * 1000;
export const STEP_MS = 3 * HOUR_MS;

/**
 * Parse the NOAA payload into `{ time: Date, kp: number, status }` rows.
 * Accepts both the array-of-arrays (with header) and array-of-objects forms.
 */
export function parseKp(payload) {
  if (!Array.isArray(payload)) {
    throw new Error('NOAA Kp payload is not an array');
  }
  const rows = [];
  for (const row of payload) {
    let timeTag;
    let kp;
    let status;
    if (Array.isArray(row)) {
      [timeTag, kp, status] = row;
      if (timeTag === 'time_tag') {
        continue; // header row
      }
    } else if (row && typeof row === 'object') {
      ({ time_tag: timeTag, kp, observed: status } = row);
    } else {
      continue;
    }
    const time = new Date(/Z$|[+-]\d\d:\d\d$/.test(timeTag) ? timeTag : `${timeTag}Z`);
    const value = Number(kp);
    if (Number.isNaN(time.getTime()) || !Number.isFinite(value)) {
      continue;
    }
    rows.push({ time, kp: value, status: String(status ?? 'predicted') });
  }
  return rows.sort((a, b) => a.time - b.time);
}

/**
 * Download and parse the forecast.
 */
export async function fetchKp({ fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(NOAA_KP_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`NOAA answered HTTP ${response.status}`);
    }
    return parseKp(await response.json());
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Alert level from a Kp value: 0 quiet, 1 active (4-5), 2 storm (5-7),
 * 3 severe (7+). A user threshold below 5 promotes its band to level 1.
 */
export function alertLevel(kp, alertKp = 5) {
  if (!Number.isFinite(kp)) {
    return 0;
  }
  if (kp >= 7) {
    return 3;
  }
  if (kp >= 5) {
    return 2;
  }
  if (kp >= Math.min(4, alertKp)) {
    return 1;
  }
  return 0;
}

function maxKp(rows) {
  return rows.length ? Math.max(...rows.map((r) => r.kp)) : null;
}

/**
 * Digest of the forecast for the sensors.
 * @returns {{ kpNow: number|null, kpMax24h: number|null, kpMax72h: number|null,
 *   alertLevel: number, alertNow: boolean,
 *   nextAlert: { start: Date, end: Date, kp: number } | null,
 *   daily: Array<{ day: Date, kp: number }> }}
 */
export function summarize(rows, now, { alertKp = 5 } = {}) {
  const past = rows.filter((r) => r.time <= now);
  const current = past.at(-1) ?? null;
  const within = (hours) =>
    rows.filter((r) => r.time > now && r.time <= new Date(now.getTime() + hours * HOUR_MS));
  const kpNow = current ? current.kp : null;
  const future = rows.filter((r) => r.time > now);
  const alert = future.find((r) => r.kp >= alertKp);
  const daily = [];
  for (let d = 0; d < 3; d += 1) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + d));
    const next = new Date(day.getTime() + 24 * HOUR_MS);
    const kp = maxKp(rows.filter((r) => r.time >= day && r.time < next));
    if (kp !== null) {
      daily.push({ day, kp });
    }
  }
  return {
    kpNow,
    kpMax24h: maxKp(within(24)),
    kpMax72h: maxKp(within(72)),
    alertLevel: alertLevel(kpNow, alertKp),
    alertNow: kpNow !== null && kpNow >= alertKp,
    nextAlert: alert
      ? { start: alert.time, end: new Date(alert.time.getTime() + STEP_MS), kp: alert.kp }
      : null,
    daily,
  };
}
