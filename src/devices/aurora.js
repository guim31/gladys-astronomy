// Device: aurora outlook (NOAA planetary Kp index).
import { PLATFORM_ID, pick, text, level, flag, risk, toStates } from './common.js';

export const DEVICE_TYPE = 'astronomy-aurora';

const NAMES = {
  fr: {
    device: 'Aurores',
    kpNow: 'Indice Kp actuel',
    kpMax24: 'Kp max sur 24 h',
    kpMax72: 'Kp max sur 72 h',
    alertLevel: 'Niveau d’alerte aurores',
    alertNow: 'Alerte aurores',
    nextAlert: 'Prochaine alerte',
    forecast: 'Prévision Kp',
    updated: 'Dernière mise à jour NOAA',
  },
  en: {
    device: 'Aurora',
    kpNow: 'Current Kp index',
    kpMax24: 'Kp max next 24 h',
    kpMax72: 'Kp max next 72 h',
    alertLevel: 'Aurora alert level',
    alertNow: 'Aurora alert',
    nextAlert: 'Next alert',
    forecast: 'Kp forecast',
    updated: 'Last NOAA update',
  },
};

export const aurora = {
  key: DEVICE_TYPE,

  isAvailable(config) {
    return config.aurora_enabled;
  },

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
        level(ids, 'kp-now', n.kpNow, { max: 9 }),
        level(ids, 'kp-max-24h', n.kpMax24, { max: 9 }),
        level(ids, 'kp-max-72h', n.kpMax72, { max: 9 }),
        risk(ids, 'alert-level', n.alertLevel),
        flag(ids, 'alert-now', n.alertNow, { history: true }),
        text(ids, 'next-alert', n.nextAlert),
        text(ids, 'forecast', n.forecast),
        text(ids, 'updated', n.updated),
      ],
    };
  },

  states(gladys, snapshot, fmt) {
    const ids = gladys.externalIds(DEVICE_TYPE, PLATFORM_ID);
    const a = snapshot.aurora;
    if (!a) {
      return [];
    }
    const s = a.summary;
    return toStates([
      [ids.feature('kp-now'), s?.kpNow ?? null],
      [ids.feature('kp-max-24h'), s?.kpMax24h ?? null],
      [ids.feature('kp-max-72h'), s?.kpMax72h ?? null],
      [ids.feature('alert-level'), s ? s.alertLevel : 0],
      [ids.feature('alert-now'), Boolean(s?.alertNow)],
      [ids.feature('next-alert'), fmt.auroraNextAlert(s)],
      [ids.feature('forecast'), fmt.auroraForecast(s)],
      [ids.feature('updated'), fmt.auroraUpdated(a)],
    ]);
  },

  /**
   * Transport entry: the device is "cloud" and degraded when NOAA is down.
   */
  transport(gladys, snapshot) {
    const a = snapshot.aurora;
    const degraded = Boolean(a && a.source !== 'noaa');
    return {
      external_id: this.deviceExternalId(gladys),
      transport: 'cloud',
      degraded,
      ...(degraded
        ? {
            message: {
              en:
                a?.source === 'cache'
                  ? 'NOAA unreachable, showing cached forecast'
                  : 'NOAA unreachable',
              fr:
                a?.source === 'cache' ? 'NOAA injoignable, prévision en cache' : 'NOAA injoignable',
            },
          }
        : {}),
    };
  },
};
