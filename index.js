// -----------------------------------------------------------------------------
// Entry point of the Gladys astronomy external integration.
//
// Role of this file: wire the SDK to the engine and the scheduler. It holds no
// business logic:
//   - src/astro/*       pure astronomy (astronomy-engine), no I/O
//   - src/aurora/noaa.js the NOAA Kp forecast, the only network module
//   - src/engine.js     the computations and their snapshot
//   - src/scheduler.js  the four cadences and the state publication
//   - src/devices/      the Gladys device payloads
//   - src/actions.js    the Configuration-screen buttons
//   - src/widgets/      the dashboard widgets (Gladys 5.1)
//   - src/scene-events.js / src/scene-actions.js  scene triggers and actions
//
// Environment variables provided by the Gladys supervisor to the container:
//   - GLADYS_HOST_API_URL, GLADYS_INTEGRATION_TOKEN, GLADYS_INTEGRATION_SELECTOR
//     (read by the SDK: `new GladysIntegration()` is enough)
//   - TZ (the Gladys system timezone; local times are formatted with it)
//   - DATA_DIR (optional, defaults to /data, the sandbox's only writable path)
// -----------------------------------------------------------------------------

import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from './src/config.js';
import { resolveLocation } from './src/location.js';
import { createEngine } from './src/engine.js';
import { startScheduler, MESSAGES } from './src/scheduler.js';
import { buildDiscoveredDevices } from './src/devices/index.js';
import { ACTIONS } from './src/actions.js';
import { WIDGETS } from './src/widgets/index.js';
import { SCENE_ACTIONS } from './src/scene-actions.js';
import { createEventScheduler } from './src/scene-events.js';

const DATA_DIR = process.env.DATA_DIR || '/data';
const LOCATION_RETRY_MS = 10 * 60 * 1000;

const gladys = new GladysIntegration();

let config = normalizeConfig();
let location = null;
let engine = null;
let scheduler = null; // { stop, poll, recompute } returned by startScheduler
let retryTimer = null;
// Serializes start/stop so a config update racing the connection handler
// never leaves two schedulers running.
let lifecycle = Promise.resolve();

function stopEverything() {
  if (scheduler) {
    scheduler.stop();
    scheduler = null;
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  engine = null;
}

/**
 * (Re)start the integration with the current configuration.
 */
async function restart() {
  stopEverything();
  location = await resolveLocation(gladys, config, { logger });
  if (!location) {
    logger.info('No house coordinates yet, retrying in 10 minutes');
    await gladys.setConnectionStatus(false, MESSAGES.noLocation);
    retryTimer = setTimeout(() => queue(restart), LOCATION_RETRY_MS);
    retryTimer.unref?.();
    return;
  }
  logger.info(
    `Observer: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)} ` +
      `(${location.source}${location.houseName ? `: ${location.houseName}` : ''}), TZ=${process.env.TZ || 'UTC'}`,
  );
  engine = createEngine({ config, location, dataDir: DATA_DIR });
  const events = createEventScheduler({ gladys, dataDir: DATA_DIR });
  try {
    scheduler = await startScheduler({ gladys, config, engine, events });
    await gladys.setConnectionStatus(true);
  } catch (err) {
    logger.error('Start failed', err);
    events.stop();
    stopEverything();
    await gladys.setConnectionStatus(false, { en: err.message, fr: err.message }).catch(() => {});
    retryTimer = setTimeout(() => queue(restart), 60000);
    retryTimer.unref?.();
  }
}

function queue(task) {
  lifecycle = lifecycle.then(task).catch((err) => logger.error('Lifecycle task failed', err));
  return lifecycle;
}

// --- Discovery: Gladys asks for the list of devices --------------------------
// The devices are static (they depend on the configuration only), so they can
// be listed even before the location is known.
gladys.onScanRequest(async () => {
  logger.info('onScanRequest -> publishing discovered devices');
  await gladys.publishDiscoveredDevices(buildDiscoveredDevices(gladys, config));
});

// --- Poll: fallback only ------------------------------------------------------
// Devices are published with `should_poll: false` (see src/devices/), so the
// core scheduler never calls this. If a user enables polling from the device
// page anyway, answer with a fresh computation rather than "not implemented".
gladys.onPoll(async (device) => {
  if (!scheduler) {
    throw new Error('astronomy not started yet (no location?)');
  }
  await scheduler.poll(device);
});

// --- A device was just created: show values without waiting a tick ----------
gladys.onDeviceCreated(async (device) => {
  if (scheduler) {
    await scheduler.poll(device);
  }
});

// --- Command: every feature is read-only -------------------------------------
gladys.onSetValue(async (device, feature) => {
  throw new Error(`astronomy sensors are read-only (${feature.external_id})`);
});

// --- Manifest actions --------------------------------------------------------
for (const [key, handler] of Object.entries(ACTIONS)) {
  gladys.onAction(key, (fields) => handler({ fields, config, scheduler, engine, location }));
}

// --- Dashboard widgets (Gladys 5.1) -------------------------------------------
// Gladys pulls the content when a dashboard shows the widget; the builders
// only read the snapshot, in the language of the user looking at it.
for (const [key, build] of Object.entries(WIDGETS)) {
  gladys.onWidgetGet(key, ({ settings, language }) =>
    build(engine?.getSnapshot(), { settings, language, now: new Date(), config }),
  );
}

// --- Scene actions (Gladys 5.1) ----------------------------------------------
for (const [key, handler] of Object.entries(SCENE_ACTIONS)) {
  gladys.onSceneAction(key, (fields) =>
    handler(fields, { snapshot: engine?.getSnapshot(), config, now: new Date() }),
  );
}

// --- Configuration updated by the user ---------------------------------------
gladys.onConfigUpdated(async (newConfig) => {
  logger.info('onConfigUpdated -> restarting with the new configuration');
  config = normalizeConfig(newConfig);
  await queue(restart);
});

// --- Connection lifecycle ----------------------------------------------------
gladys.on('connected', async () => {
  try {
    config = normalizeConfig(await gladys.getConfig());
  } catch (err) {
    logger.error('Cannot fetch the configuration', err);
    return;
  }
  await queue(restart);
});

gladys.on('disconnected', () => {
  queue(async () => stopEverything());
});

// --- Graceful shutdown -------------------------------------------------------
gladys.handleShutdown((signal) => {
  logger.info(`Received ${signal} -> graceful shutdown`);
  stopEverything();
});

// --- Startup -----------------------------------------------------------------
logger.info('Starting the astronomy integration...');
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
