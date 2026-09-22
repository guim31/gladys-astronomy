// -----------------------------------------------------------------------------
// The engine: runs the astronomy modules for the house and keeps the result
// in a snapshot the devices (today) and the widgets (later) read from.
//
// Three computation scopes, each with its own cadence (see scheduler.js):
//   - rare  : eclipses, transits, seasons, apsides, planet events, conjunctions
//   - night : the night around now (twilights, dark window, planets, showers)
//   - live  : the cheap countdowns and flags derived from the two above
// plus the aurora refresh, the only one touching the network.
// -----------------------------------------------------------------------------

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createLogger } from '@gladysassistant/integration-sdk';
import { makeObserver, DAY_MS } from './astro/observer.js';
import { nextSolarEclipse, nextLunarEclipse, nextTransit } from './astro/eclipses.js';
import { nextSeason, dayLength, nextApsis, sunDistanceKm } from './astro/seasons.js';
import { describeNight, skyScore, moonIllumination, eveningNear } from './astro/night.js';
import { planetsInWindow, upcomingPlanetEvents } from './astro/planets.js';
import { upcomingConjunctions } from './astro/conjunctions.js';
import { activeShowers, upcomingPeaks, moonAtPeak, radiantAltitude } from './astro/meteors.js';
import { fetchKp, summarize } from './aurora/noaa.js';
import { localMidnight, localDayKey } from './time.js';

const logger = createLogger({ name: 'engine' });

export const AURORA_CACHE_MAX_AGE_MS = 6 * 3600 * 1000;

function daysUntil(date, now) {
  return date ? Math.max(0, Math.round(((date - now) / DAY_MS) * 10) / 10) : null;
}

function minutesUntil(date, now) {
  return date ? Math.max(0, Math.round((date - now) / 60000)) : null;
}

/**
 * @param {object} options
 * @param {object} options.config normalized configuration
 * @param {{ latitude: number, longitude: number, elevation: number }} options.location
 * @param {string} options.dataDir writable directory for the NOAA cache
 * @param {() => Date} [options.now] clock, injectable for tests
 * @param {typeof fetch} [options.fetchImpl] injectable for tests
 */
export function createEngine({ config, location, dataDir, now = () => new Date(), fetchImpl }) {
  const observer = makeObserver(location);
  const cachePath = path.join(dataDir, 'noaa-kp.json');
  const snapshot = {
    location,
    computedAt: { rare: null, night: null, live: null, aurora: null },
    rare: null,
    night: null,
    live: null,
    aurora: null,
  };

  function decorateShower(shower) {
    return {
      ...shower,
      moon: moonAtPeak(shower.peak, observer),
      radiantAltitude: radiantAltitude(shower, shower.peak, observer),
      evening: eveningNear(shower.peak, observer)?.evening ?? null,
    };
  }

  function computeRare() {
    const at = now();
    snapshot.rare = {
      solar: nextSolarEclipse(at, observer),
      lunar: nextLunarEclipse(at, observer),
      transit: nextTransit(at, observer),
      season: nextSeason(at),
      apsis: nextApsis(at),
      planetEvents: upcomingPlanetEvents(at),
      conjunctions: upcomingConjunctions(at, observer, {
        lookaheadDays: config.conjunction_lookahead_days,
        maxSeparation: config.conjunction_max_separation,
      }).map((c) => ({ ...c, evening: eveningNear(c.time, observer)?.evening ?? null })),
    };
    snapshot.computedAt.rare = at;
    return snapshot.rare;
  }

  function computeNight() {
    const at = now();
    const night = describeNight(at, observer, {
      moonMaxIllumination: config.moon_max_illumination,
      bortle: config.bortle,
    });
    const window = night.night
      ? {
          start: night.twilights.civil.dusk ?? night.night.start,
          end: night.twilights.civil.dawn ?? night.night.end,
        }
      : null;
    const showers = activeShowers(at, { minZhr: config.meteor_min_zhr }).map(decorateShower);
    const peaks = upcomingPeaks(at, { minZhr: config.meteor_min_zhr, count: 4 }).map(
      decorateShower,
    );
    const upcoming = peaks[0] ?? null;
    snapshot.night = {
      ...night,
      planets: window ? planetsInWindow(window, observer) : [],
      activeShowers: showers,
      nextPeak: upcoming,
      upcomingPeaks: peaks,
      peakTonight: Boolean(
        upcoming &&
        night.night &&
        upcoming.peak >= night.night.start &&
        upcoming.peak <= night.night.end,
      ),
    };
    snapshot.computedAt.night = at;
    return snapshot.night;
  }

  function computeLive() {
    const at = now();
    if (!snapshot.rare) {
      computeRare();
    }
    if (!snapshot.night) {
      computeNight();
    }
    const { rare, night } = snapshot;
    const today = localMidnight(at);
    const yesterday = new Date(today.getTime() - DAY_MS);
    const lengthToday = dayLength(today, observer).hours;
    const lengthYesterday = dayLength(yesterday, observer).hours;
    const moonless = night.moonless;
    const inMoonless = Boolean(moonless && at >= moonless.start && at <= moonless.end);
    const dayKey = localDayKey(at);
    const eclipseToday =
      localDayKey(rare.solar.peak) === dayKey ||
      (rare.lunar ? localDayKey(rare.lunar.peak) === dayKey : false);
    const nextConjunction = rare.conjunctions.find((c) => c.time > at) ?? null;
    const nextPlanetEvent = rare.planetEvents.find((e) => e.time > at) ?? null;
    snapshot.live = {
      now: at,
      sunDistanceKm: sunDistanceKm(at),
      dayLengthHours: lengthToday,
      dayLengthDeltaMinutes: (lengthToday - lengthYesterday) * 60,
      skyScore: skyScore(at, observer, { bortle: config.bortle }),
      moonIllumination: moonIllumination(at),
      darkNow: inMoonless,
      darkWindowStartIn: moonless ? (inMoonless ? 0 : minutesUntil(moonless.start, at)) : 0,
      darkWindowMinutes: moonless && at <= moonless.end ? moonless.minutes : 0,
      eclipseToday,
      solarDays: daysUntil(rare.solar.partialBegin, at),
      lunarDays: rare.lunar ? daysUntil(rare.lunar.begin, at) : null,
      transitDays: daysUntil(rare.transit.start, at),
      seasonDays: daysUntil(rare.season.time, at),
      apsisDays: daysUntil(rare.apsis.time, at),
      nextConjunction,
      conjunctionDays: nextConjunction ? daysUntil(nextConjunction.time, at) : null,
      nextPlanetEvent,
      planetEventDays: nextPlanetEvent ? daysUntil(nextPlanetEvent.time, at) : null,
      nextPeakDays: night.nextPeak ? daysUntil(night.nextPeak.peak, at) : null,
    };
    snapshot.computedAt.live = at;
    return snapshot.live;
  }

  async function readCache() {
    try {
      const raw = JSON.parse(await readFile(cachePath, 'utf8'));
      return {
        fetchedAt: new Date(raw.fetchedAt),
        rows: raw.rows.map((r) => ({ ...r, time: new Date(r.time) })),
      };
    } catch {
      return null;
    }
  }

  async function writeCache(fetchedAt, rows) {
    try {
      await mkdir(dataDir, { recursive: true });
      await writeFile(cachePath, JSON.stringify({ fetchedAt, rows }));
    } catch (err) {
      logger.warn(`Cannot write the NOAA cache: ${err.message}`);
    }
  }

  /**
   * Refresh the Kp forecast. Never throws: a NOAA outage degrades the aurora
   * device (cache, then "unavailable"), it never fails the integration.
   */
  async function refreshAurora() {
    const at = now();
    let rows = null;
    let fetchedAt = null;
    let source = null;
    let error = null;
    try {
      rows = await fetchKp({ fetchImpl });
      fetchedAt = at;
      source = 'noaa';
      await writeCache(fetchedAt, rows);
    } catch (err) {
      error = err.message;
      logger.warn(`NOAA Kp fetch failed: ${err.message}`);
      const cached = await readCache();
      if (cached && at - cached.fetchedAt <= AURORA_CACHE_MAX_AGE_MS) {
        rows = cached.rows;
        fetchedAt = cached.fetchedAt;
        source = 'cache';
      }
    }
    snapshot.aurora = {
      summary: rows ? summarize(rows, at, { alertKp: config.aurora_kp_alert }) : null,
      rows: rows ?? [],
      fetchedAt,
      source,
      error,
    };
    snapshot.computedAt.aurora = at;
    return snapshot.aurora;
  }

  /**
   * Every scope at once (manifest action, tests).
   */
  async function computeAll() {
    computeRare();
    computeNight();
    computeLive();
    if (config.aurora_enabled) {
      await refreshAurora();
    }
    return snapshot;
  }

  return {
    observer,
    computeRare,
    computeNight,
    computeLive,
    refreshAurora,
    computeAll,
    getSnapshot: () => snapshot,
  };
}
