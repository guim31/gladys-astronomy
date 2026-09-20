// Device: seasons and Earth's orbit.
import { PLATFORM_ID, UNITS, pick, text, duration, distance, toStates, round } from './common.js';
import { DEVICE_FEATURE_CATEGORIES, DEVICE_FEATURE_TYPES } from '@gladysassistant/integration-sdk';

export const DEVICE_TYPE = 'astronomy-seasons';

const NAMES = {
  fr: {
    device: 'Saisons et orbite',
    next: 'Prochaine saison',
    nextKind: 'Type (saison)',
    nextDays: 'Prochaine saison dans',
    dayLength: 'Durée du jour',
    dayDelta: 'Variation du jour',
    apsis: 'Prochaine apside',
    apsisDays: 'Apside dans',
    sunDistance: 'Distance Terre-Soleil',
  },
  en: {
    device: 'Seasons and orbit',
    next: 'Next season',
    nextKind: 'Kind (season)',
    nextDays: 'Next season in',
    dayLength: 'Day length',
    dayDelta: 'Day length change',
    apsis: 'Next apsis',
    apsisDays: 'Apsis in',
    sunDistance: 'Earth-Sun distance',
  },
};

export const seasons = {
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
        text(ids, 'next-event', n.next),
        text(ids, 'next-event-kind', n.nextKind),
        duration(ids, 'next-event-days', n.nextDays, UNITS.DAYS, 400),
        duration(ids, 'day-length', n.dayLength, UNITS.HOURS, 24, { decimal: true, history: true }),
        {
          name: n.dayDelta,
          external_id: ids.feature('day-length-delta'),
          category: DEVICE_FEATURE_CATEGORIES.DURATION,
          type: DEVICE_FEATURE_TYPES.DURATION.DECIMAL,
          unit: UNITS.MINUTES,
          min: -6,
          max: 6,
          read_only: true,
          has_feedback: false,
          keep_history: true,
        },
        text(ids, 'next-apsis', n.apsis),
        duration(ids, 'next-apsis-days', n.apsisDays, UNITS.DAYS, 400),
        distance(ids, 'sun-distance', n.sunDistance, 140000000, 153000000),
      ],
    };
  },

  states(gladys, snapshot, fmt) {
    const ids = gladys.externalIds(DEVICE_TYPE, PLATFORM_ID);
    const { rare, live } = snapshot;
    if (!rare || !live) {
      return [];
    }
    return toStates([
      [ids.feature('next-event'), fmt.season(rare.season)],
      [ids.feature('next-event-kind'), rare.season?.kind],
      [ids.feature('next-event-days'), live.seasonDays],
      [ids.feature('day-length'), round(live.dayLengthHours, 2)],
      [ids.feature('day-length-delta'), round(live.dayLengthDeltaMinutes, 1)],
      [ids.feature('next-apsis'), fmt.apsis(rare.apsis)],
      [ids.feature('next-apsis-days'), live.apsisDays],
      [ids.feature('sun-distance'), Math.round(live.sunDistanceKm)],
    ]);
  },
};
