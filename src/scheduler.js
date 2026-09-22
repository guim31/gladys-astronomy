// -----------------------------------------------------------------------------
// Scheduler: the four cadences of the integration, inside the container.
//
// Gladys polling only offers sub-minute intervals and one frequency per
// device; these sensors change on minute-to-day scales and one device mixes
// several cadences, so the integration schedules itself and pushes states:
//   - rare   : once a day at 03:00 local (eclipses, seasons, conjunctions...)
//   - night  : every 30 min (twilights, dark window, planets, showers)
//   - live   : every `refresh_minutes` (countdowns, flags, instantaneous score)
//   - aurora : every 30 min (NOAA fetch), when enabled
//
// After each scope, the scene-event timers are re-planned (`events`, see
// scene-events.js) and the dashboard widgets fed by that scope are nudged.
//
// Failure policy: the computations are local and cannot fail on the network;
// an exception there is a bug, logged and retried at the next tick. The NOAA
// fetch degrades the aurora device (cache, then "unavailable") and never
// flags the integration as disconnected.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import {
  buildDiscoveredDevices,
  statesFor,
  availableDevices,
  aurora,
  SCOPES,
} from './devices/index.js';
import { createFormatter } from './formatters.js';
import { nextLocalTime } from './time.js';
import { planEvents } from './scene-events.js';
import { REFRESH_AFTER } from './widgets/index.js';

const logger = createLogger({ name: 'scheduler' });

export const RARE_LOCAL_TIME = '03:00';
export const NIGHT_INTERVAL_MS = 30 * 60 * 1000;
export const AURORA_INTERVAL_MS = 30 * 60 * 1000;
/** A value unchanged since its last publication is re-sent at most this often. */
export const REPUBLISH_UNCHANGED_MS = 30 * 60 * 1000;
/** Core limit: 100 states per POST /state. */
export const STATES_PER_BATCH = 100;

export const MESSAGES = {
  noLocation: {
    en: 'No coordinates: set the location of your house in Gladys (Settings > Houses), or type latitude/longitude in the configuration.',
    fr: 'Aucune coordonnée : localisez votre maison dans Gladys (Paramètres > Maisons), ou saisissez latitude/longitude dans la configuration.',
  },
};

/**
 * Publish the devices, compute everything once, start the timers.
 * @param {object} options
 * @param {object} [options.events] scene-event scheduler (createEventScheduler)
 * @returns {Promise<{ stop: () => void, poll: (device: object) => Promise<void>,
 *   recompute: () => Promise<void> }>}
 */
export async function startScheduler({
  gladys,
  config,
  engine,
  events = null,
  now = () => new Date(),
}) {
  const fmt = createFormatter(config.language);
  await gladys.publishDiscoveredDevices(buildDiscoveredDevices(gladys, config));

  let stopped = false;
  const timers = [];
  const running = new Set();
  const lastSent = new Map(); // feature external id -> { value, at }

  function stop() {
    stopped = true;
    events?.stop();
    for (const timer of timers) {
      clearInterval(timer);
      clearTimeout(timer);
    }
    timers.length = 0;
  }

  /**
   * Publish only what changed (or is older than REPUBLISH_UNCHANGED_MS), in
   * batches the core accepts.
   */
  async function publish(states, { force = false } = {}) {
    const at = now().getTime();
    const fresh = states.filter((s) => {
      const value = s.text ?? s.state;
      const previous = lastSent.get(s.device_feature_external_id);
      return (
        force || !previous || previous.value !== value || at - previous.at >= REPUBLISH_UNCHANGED_MS
      );
    });
    for (let i = 0; i < fresh.length; i += STATES_PER_BATCH) {
      const batch = fresh.slice(i, i + STATES_PER_BATCH);
      await gladys.publishStates(batch);
      for (const s of batch) {
        lastSent.set(s.device_feature_external_id, { value: s.text ?? s.state, at });
      }
    }
  }

  async function guarded(label, fn) {
    if (stopped || running.has(label)) {
      return;
    }
    running.add(label);
    try {
      await fn();
    } catch (err) {
      logger.error(`${label} failed: ${err.message}`, err);
    } finally {
      running.delete(label);
    }
  }

  const snapshot = () => engine.getSnapshot();

  /** Ask Gladys to re-pull the widgets fed by a scope (rate-limited core-side). */
  function nudge(scope) {
    for (const key of REFRESH_AFTER[scope] ?? []) {
      try {
        gladys.requestWidgetRefresh?.(key);
      } catch (err) {
        logger.warn(`requestWidgetRefresh ${key}: ${err.message}`);
      }
    }
  }

  async function replanEvents() {
    await events?.replan(planEvents(snapshot(), { fmt }));
  }

  async function rareTick({ force = false } = {}) {
    await guarded('rare', async () => {
      engine.computeRare();
      engine.computeLive();
      await publish(statesFor(gladys, snapshot(), config, fmt, SCOPES.rare), { force });
      await replanEvents();
      nudge('rare');
    });
  }

  async function nightTick({ force = false } = {}) {
    await guarded('night', async () => {
      engine.computeNight();
      engine.computeLive();
      await publish(statesFor(gladys, snapshot(), config, fmt, SCOPES.night), { force });
      await replanEvents();
      nudge('night');
    });
  }

  async function liveTick({ force = false } = {}) {
    await guarded('live', async () => {
      engine.computeLive();
      await publish(statesFor(gladys, snapshot(), config, fmt, SCOPES.live), { force });
    });
  }

  async function auroraTick({ force = false } = {}) {
    if (!aurora.isAvailable(config)) {
      return;
    }
    await guarded('aurora', async () => {
      await engine.refreshAurora();
      await publish(statesFor(gladys, snapshot(), config, fmt, SCOPES.aurora), { force });
      await gladys.publishTransports([aurora.transport(gladys, snapshot())]);
      await events?.onAuroraSummary(snapshot().aurora?.summary, fmt);
      nudge('aurora');
    });
  }

  function scheduleRare() {
    if (stopped) {
      return;
    }
    const at = nextLocalTime(RARE_LOCAL_TIME, now());
    const delay = Math.max(1000, at.getTime() - now().getTime());
    const timer = setTimeout(async () => {
      await rareTick();
      scheduleRare();
    }, delay);
    timer.unref?.();
    timers.push(timer);
  }

  /**
   * Everything, now, published even if unchanged (manifest action, config
   * update).
   */
  async function recompute() {
    await rareTick({ force: true });
    await nightTick({ force: true });
    await liveTick({ force: true });
    await auroraTick({ force: true });
  }

  /**
   * Gladys asked to poll one of our devices (not expected: `should_poll` is
   * false). Answer with a fresh computation of that device's states.
   */
  async function poll(device) {
    if (stopped) {
      return;
    }
    const target = availableDevices(config).find(
      (d) => d.deviceExternalId(gladys) === device?.external_id,
    );
    if (!target) {
      logger.warn(`Poll requested for an unknown device: ${device?.external_id}`);
      return;
    }
    await guarded(`poll ${target.key}`, async () => {
      if (target === aurora) {
        await engine.refreshAurora();
      } else {
        engine.computeNight();
        engine.computeLive();
      }
      await publish(statesFor(gladys, snapshot(), config, fmt, [target]), { force: true });
    });
  }

  await recompute();
  if (!stopped) {
    scheduleRare();
    timers.push(setInterval(nightTick, NIGHT_INTERVAL_MS));
    timers.push(setInterval(liveTick, config.refresh_minutes * 60 * 1000));
    if (aurora.isAvailable(config)) {
      timers.push(setInterval(auroraTick, AURORA_INTERVAL_MS));
    }
    logger.info(
      `Scheduled: rare events daily at ${RARE_LOCAL_TIME}, night every 30 min, ` +
        `live every ${config.refresh_minutes} min, aurora ${aurora.isAvailable(config) ? 'every 30 min' : 'off'}`,
    );
  }
  return { stop, poll, recompute };
}
