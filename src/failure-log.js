// -----------------------------------------------------------------------------
// Deduplicated logging of a recurring failure: one line when it starts, one
// when it is over, and only debug lines while it lasts. The cadences of the
// integration (NOAA every 30 min, local ticks every few minutes) would
// otherwise repeat the same warning all day long during an outage.
// -----------------------------------------------------------------------------

/**
 * @param {object} logger SDK logger
 * @param {string} label what fails, e.g. 'NOAA Kp fetch'
 * @param {{ level?: 'warn' | 'error' }} [options] level of the first line
 * @returns {{ fail: (err: unknown) => void, ok: () => void, readonly failing: boolean }}
 */
export function createFailureLog(logger, label, { level = 'warn' } = {}) {
  let failing = false;
  return {
    fail(err) {
      const message = err?.message ?? String(err);
      if (failing) {
        logger.debug(`${label} still failing: ${message}`);
        return;
      }
      failing = true;
      if (level === 'error' && err instanceof Error) {
        logger.error(`${label} failed: ${message}`, err);
      } else {
        logger[level](`${label} failed: ${message}`);
      }
    },
    ok() {
      if (failing) {
        failing = false;
        logger.info(`${label} works again`);
      }
    },
    get failing() {
      return failing;
    },
  };
}
