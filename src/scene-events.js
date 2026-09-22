// -----------------------------------------------------------------------------
// Scene triggers (Gladys 5.1): "something happens in the sky now".
//
// One event per TRANSITION, as the core asks: the start of an eclipse phase,
// of the moonless window, the evening of a meteor peak or of a conjunction,
// the instant of an equinox, a rising aurora alert. States (a Kp value, a
// countdown) stay on the device features, where scenes can use thresholds.
//
//   - planEvents(snapshot, ...)  pure: the upcoming timed events, stable ids
//   - createEventScheduler(...)  arms timers for the next 24 h, publishes
//     through gladys.publishSceneEvent, remembers what was sent in /data so a
//     restart neither replays nor loses an event (15 min catch-up at most)
// -----------------------------------------------------------------------------

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createLogger } from '@gladysassistant/integration-sdk';
import { localDayKey } from './time.js';

const logger = createLogger({ name: 'scene-events' });

export const TRIGGER_KEYS = [
  'eclipse_phase',
  'dark_window_starting',
  'meteor_peak_night',
  'conjunction_tonight',
  'aurora_alert',
  'season_starting',
];

const HOUR_MS = 3600 * 1000;
export const ARM_WINDOW_MS = 24 * HOUR_MS;
export const CATCH_UP_MS = 15 * 60 * 1000;
export const FORGET_AFTER_MS = 7 * 24 * HOUR_MS;

const iso = (d) => (d instanceof Date ? d.toISOString() : null);
const round = (v, n = 1) => (Number.isFinite(v) ? Math.round(v * 10 ** n) / 10 ** n : null);

/**
 * The upcoming timed events of the snapshot, chronological. `aurora_alert` is
 * not timed: see onAuroraSummary.
 * @param {object} snapshot engine snapshot
 * @param {{ fmt: object }} options formatter in the configured language
 * @returns {Array<{ key: string, id: string, at: Date, data: object }>}
 */
export function planEvents(snapshot, { fmt }) {
  const { rare, night, live } = snapshot ?? {};
  const events = [];
  const push = (key, id, at, data) => {
    if (at instanceof Date && !Number.isNaN(at.getTime())) {
      events.push({ key, id: `${key}:${id}`, at, data });
    }
  };

  if (rare?.solar) {
    const e = rare.solar;
    const base = {
      body: 'sun',
      kind: e.kind,
      obscuration: Math.round(e.obscuration * 100),
      peak_time: iso(e.peak),
      end_time: iso(e.partialEnd),
      description: fmt.solarEclipse(e),
    };
    const day = e.peak.toISOString().slice(0, 10);
    push('eclipse_phase', `sun:begin:${day}`, e.partialBegin, { ...base, phase: 'begin' });
    push('eclipse_phase', `sun:peak:${day}`, e.peak, { ...base, phase: 'peak' });
  }
  if (rare?.lunar) {
    const e = rare.lunar;
    const base = {
      body: 'moon',
      kind: e.kind,
      obscuration: Math.round(e.obscuration * 100),
      peak_time: iso(e.peak),
      end_time: iso(e.end),
      description: fmt.lunarEclipse(e),
    };
    const day = e.peak.toISOString().slice(0, 10);
    // The eclipse may start while the Moon is still below the horizon: the
    // "begin" of the house is the moment it becomes observable.
    push('eclipse_phase', `moon:begin:${day}`, e.visibleFrom, { ...base, phase: 'begin' });
    if (e.moonAltitudeAtPeak > 0) {
      push('eclipse_phase', `moon:peak:${day}`, e.peak, { ...base, phase: 'peak' });
    }
  }

  if (night?.moonless) {
    const m = night.moonless;
    push('dark_window_starting', localDayKey(night.night.start), m.start, {
      duration_minutes: m.minutes,
      end_time: iso(m.end),
      best_score: night.bestScore,
      summary: fmt.nightSummary(night),
    });
  }

  for (const shower of night?.upcomingPeaks ?? []) {
    if (!shower.evening) {
      continue;
    }
    push('meteor_peak_night', `${shower.code}:${shower.year}`, shower.evening, {
      shower: shower.code,
      name: fmt.showerName(shower),
      zhr: shower.zhr,
      peak_time: iso(shower.peak),
      moon_illumination: shower.moon?.illumination ?? null,
      description: fmt.nextPeak(shower),
    });
  }

  for (const c of rare?.conjunctions ?? []) {
    if (!c.visible || !c.evening) {
      continue;
    }
    // Keyed by the evening's local day: the refined minimum moves by a few
    // minutes with the scan grid, the evening does not.
    push('conjunction_tonight', `${c.bodies.join('-')}:${localDayKey(c.evening)}`, c.evening, {
      involves_moon: c.bodies.includes('moon') ? 'yes' : 'no',
      bodies: c.bodies.join('-'),
      separation: c.separation,
      time: iso(c.time),
      description: fmt.conjunction(c),
    });
  }

  if (rare?.season) {
    const s = rare.season;
    push('season_starting', `${s.kind}:${s.time.getUTCFullYear()}`, s.time, {
      kind: s.kind,
      name: fmt.t.season[s.kind],
      day_length_hours: round(live?.dayLengthHours, 2),
    });
  }
  return events.sort((a, b) => a.at - b.at);
}

/**
 * Payload of an aurora alert from the NOAA digest.
 */
export function auroraEventData(summary, fmt) {
  return {
    level: summary.alertLevel,
    kp: summary.kpNow,
    kp_max_24h: summary.kpMax24h,
    next_alert: summary.nextAlert ? iso(summary.nextAlert.start) : null,
    description: `Kp ${fmt.num(summary.kpNow, 2)} · ${fmt.auroraNextAlert(summary)}`,
  };
}

/**
 * @param {object} options
 * @param {object} options.gladys SDK instance (publishSceneEvent)
 * @param {string} options.dataDir where fired-events.json lives
 * @param {() => Date} [options.now]
 */
export function createEventScheduler({ gladys, dataDir, now = () => new Date() }) {
  const file = path.join(dataDir, 'fired-events.json');
  let state = null; // { fired: { [id]: isoDate }, auroraLevel: number }
  const timers = new Map(); // id -> timeout
  const refusedKeys = new Set();
  const inflight = new Set();
  let stopped = false;

  async function load() {
    if (state) {
      return state;
    }
    try {
      const raw = JSON.parse(await readFile(file, 'utf8'));
      state = { fired: raw.fired ?? {}, auroraLevel: Number(raw.auroraLevel) || 0 };
    } catch {
      state = { fired: {}, auroraLevel: 0 };
    }
    return state;
  }

  async function save() {
    const limit = now().getTime() - FORGET_AFTER_MS;
    for (const [id, at] of Object.entries(state.fired)) {
      if (new Date(at).getTime() < limit) {
        delete state.fired[id];
      }
    }
    try {
      await mkdir(dataDir, { recursive: true });
      await writeFile(file, JSON.stringify(state));
    } catch (err) {
      logger.warn(`Cannot persist the fired events: ${err.message}`);
    }
  }

  /**
   * Publish one event. A refusal by the core (400/404: payload or key not
   * accepted, an older Gladys) is logged once per key and marked as sent so
   * it is not retried; a transient failure is retried at the next replan
   * while still within the catch-up window.
   */
  async function publish(key, id, data) {
    try {
      await gladys.publishSceneEvent(key, data);
      logger.info(`Scene event ${id}`);
    } catch (err) {
      if (err?.status !== 400 && err?.status !== 404) {
        logger.warn(`Scene event ${id} failed: ${err.message}`);
        return false;
      }
      if (!refusedKeys.has(key)) {
        refusedKeys.add(key);
        logger.warn(`Gladys refused the scene event ${key} (${err.status}): ${err.message}`);
      }
    }
    state.fired[id] = now().toISOString();
    await save();
    return true;
  }

  async function fire(event) {
    timers.delete(event.id);
    if (stopped) {
      return;
    }
    await load();
    if (state.fired[event.id]) {
      return;
    }
    await publish(event.key, event.id, event.data);
  }

  function clearTimers() {
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
    timers.clear();
  }

  /**
   * Re-arm the timers from a fresh plan: events already due within the
   * catch-up window fire now, the next 24 h get a timer, the rest waits for a
   * later replan.
   */
  async function replan(events) {
    if (stopped) {
      return;
    }
    await load();
    clearTimers();
    const at = now().getTime();
    for (const event of events) {
      if (state.fired[event.id]) {
        continue;
      }
      const delay = event.at.getTime() - at;
      if (delay <= 0) {
        if (-delay <= CATCH_UP_MS) {
          await fire(event);
        }
        continue;
      }
      if (delay <= ARM_WINDOW_MS) {
        const timer = setTimeout(() => {
          const run = fire(event)
            .catch((err) => logger.error(`fire ${event.id}`, err))
            .finally(() => inflight.delete(run));
          inflight.add(run);
        }, delay);
        timer.unref?.();
        timers.set(event.id, timer);
      }
    }
  }

  /**
   * Called after each NOAA refresh: fires `aurora_alert` on a rising alert
   * level only (quiet -> active, active -> storm...), never while it stays.
   */
  async function onAuroraSummary(summary, fmt) {
    if (stopped || !summary) {
      return;
    }
    await load();
    const previous = state.auroraLevel;
    const level = summary.alertLevel;
    state.auroraLevel = level;
    if (level >= 1 && level > previous) {
      const id = `aurora_alert:${level}:${now().toISOString()}`;
      await publish('aurora_alert', id, auroraEventData(summary, fmt));
      return;
    }
    if (level !== previous) {
      await save();
    }
  }

  function stop() {
    stopped = true;
    clearTimers();
  }

  return {
    replan,
    onAuroraSummary,
    stop,
    /** Ids of the events with an armed timer. */
    armed: () => [...timers.keys()],
    /** Resolves once the timers that already went off are fully handled. */
    idle: () => Promise.all([...inflight]),
  };
}
