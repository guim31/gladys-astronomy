// Device: tonight's observing conditions.
import {
  PLATFORM_ID,
  UNITS,
  pick,
  text,
  duration,
  level,
  flag,
  toStates,
  round,
} from './common.js';

export const DEVICE_TYPE = 'astronomy-night';

const NAMES = {
  fr: {
    device: 'Nuit d’observation',
    summary: 'Résumé de la nuit',
    civilDusk: 'Crépuscule civil',
    nauticalDusk: 'Crépuscule nautique',
    astroDusk: 'Crépuscule astronomique',
    astroDawn: 'Aube astronomique',
    startIn: 'Fenêtre sans Lune dans',
    windowDuration: 'Durée de la fenêtre sans Lune',
    darkNow: 'Ciel noir maintenant',
    score: 'Qualité du ciel',
    scoreTonight: 'Meilleure qualité de la nuit',
    moon: 'Illumination de la Lune',
  },
  en: {
    device: 'Observing night',
    summary: 'Night summary',
    civilDusk: 'Civil dusk',
    nauticalDusk: 'Nautical dusk',
    astroDusk: 'Astronomical dusk',
    astroDawn: 'Astronomical dawn',
    startIn: 'Moonless window in',
    windowDuration: 'Moonless window length',
    darkNow: 'Dark sky now',
    score: 'Sky quality',
    scoreTonight: 'Best sky quality tonight',
    moon: 'Moon illumination',
  },
};

export const night = {
  key: DEVICE_TYPE,

  deviceExternalId(gladys) {
    return gladys.externalIds(DEVICE_TYPE, PLATFORM_ID).device;
  },

  buildDevice(gladys, config) {
    const ids = gladys.externalIds(DEVICE_TYPE, PLATFORM_ID);
    const n = pick(NAMES, config.language);
    return {
      name: n.device,
      external_id: ids.device,
      should_poll: false,
      features: [
        text(ids, 'summary', n.summary),
        text(ids, 'civil-dusk', n.civilDusk),
        text(ids, 'nautical-dusk', n.nauticalDusk),
        text(ids, 'astro-dusk', n.astroDusk),
        text(ids, 'astro-dawn', n.astroDawn),
        duration(ids, 'dark-window-start-in', n.startIn, UNITS.MINUTES, 1440),
        duration(ids, 'dark-window-duration', n.windowDuration, UNITS.HOURS, 16, {
          decimal: true,
          history: true,
        }),
        flag(ids, 'dark-now', n.darkNow, { history: true }),
        level(ids, 'sky-score', n.score, { max: 10 }),
        level(ids, 'sky-score-tonight', n.scoreTonight, { max: 10 }),
        level(ids, 'moon-illumination', n.moon, { unit: UNITS.PERCENT }),
      ],
    };
  },

  states(gladys, snapshot, fmt) {
    const ids = gladys.externalIds(DEVICE_TYPE, PLATFORM_ID);
    const n = snapshot.night;
    const live = snapshot.live;
    if (!n || !live) {
      return [];
    }
    const tw = n.twilights ?? { civil: {}, nautical: {}, astronomical: {} };
    return toStates([
      [ids.feature('summary'), fmt.nightSummary(n)],
      [ids.feature('civil-dusk'), fmt.time(tw.civil.dusk)],
      [ids.feature('nautical-dusk'), fmt.time(tw.nautical.dusk)],
      [ids.feature('astro-dusk'), fmt.time(tw.astronomical.dusk)],
      [ids.feature('astro-dawn'), fmt.time(tw.astronomical.dawn)],
      [ids.feature('dark-window-start-in'), live.darkWindowStartIn],
      [ids.feature('dark-window-duration'), round(live.darkWindowMinutes / 60, 2)],
      [ids.feature('dark-now'), live.darkNow],
      [ids.feature('sky-score'), live.skyScore],
      [ids.feature('sky-score-tonight'), n.night ? n.bestScore : 0],
      [ids.feature('moon-illumination'), round(live.moonIllumination, 0)],
    ]);
  },
};
