// Device: the next eclipses and transits visible from the house.
import { NONE } from '../formatters.js';
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

export const DEVICE_TYPE = 'astronomy-eclipses';

const NAMES = {
  fr: {
    device: 'Éclipses',
    solar: 'Prochaine éclipse solaire',
    solarKind: 'Type (solaire)',
    solarDays: 'Éclipse solaire dans',
    solarObscuration: 'Obscuration (solaire)',
    lunar: 'Prochaine éclipse lunaire',
    lunarKind: 'Type (lunaire)',
    lunarDays: 'Éclipse lunaire dans',
    transit: 'Prochain transit',
    transitDays: 'Transit dans',
    today: 'Éclipse aujourd’hui',
  },
  en: {
    device: 'Eclipses',
    solar: 'Next solar eclipse',
    solarKind: 'Kind (solar)',
    solarDays: 'Solar eclipse in',
    solarObscuration: 'Obscuration (solar)',
    lunar: 'Next lunar eclipse',
    lunarKind: 'Kind (lunar)',
    lunarDays: 'Lunar eclipse in',
    transit: 'Next transit',
    transitDays: 'Transit in',
    today: 'Eclipse today',
  },
};

export const eclipses = {
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
        text(ids, 'solar-next', n.solar),
        text(ids, 'solar-next-kind', n.solarKind),
        duration(ids, 'solar-next-days', n.solarDays, UNITS.DAYS, 5000),
        level(ids, 'solar-next-obscuration', n.solarObscuration, {
          unit: UNITS.PERCENT,
          history: false,
        }),
        text(ids, 'lunar-next', n.lunar),
        text(ids, 'lunar-next-kind', n.lunarKind),
        duration(ids, 'lunar-next-days', n.lunarDays, UNITS.DAYS, 5000),
        text(ids, 'transit-next', n.transit),
        duration(ids, 'transit-next-days', n.transitDays, UNITS.DAYS, 40000),
        flag(ids, 'today', n.today, { history: true }),
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
      [ids.feature('solar-next'), fmt.solarEclipse(rare.solar)],
      [ids.feature('solar-next-kind'), rare.solar?.kind ?? NONE],
      [ids.feature('solar-next-days'), live.solarDays],
      [ids.feature('solar-next-obscuration'), round(rare.solar.obscuration * 100, 0)],
      [ids.feature('lunar-next'), fmt.lunarEclipse(rare.lunar)],
      [ids.feature('lunar-next-kind'), rare.lunar?.kind ?? NONE],
      [ids.feature('lunar-next-days'), live.lunarDays],
      [ids.feature('transit-next'), fmt.transit(rare.transit)],
      [ids.feature('transit-next-days'), live.transitDays],
      [ids.feature('today'), live.eclipseToday],
    ]);
  },
};
