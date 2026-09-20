// Device: naked-eye planets tonight, conjunctions and planetary events.
import { NONE } from '../formatters.js';
import { PLATFORM_ID, UNITS, pick, text, duration, counter, angle, toStates } from './common.js';

export const DEVICE_TYPE = 'astronomy-planets';

const NAMES = {
  fr: {
    device: 'Planètes',
    visible: 'Planètes visibles cette nuit',
    count: 'Nombre de planètes visibles',
    brightest: 'Planète la plus brillante',
    conjunction: 'Prochaine conjonction',
    conjunctionDays: 'Conjonction dans',
    separation: 'Séparation (conjonction)',
    event: 'Prochain événement planétaire',
    eventDays: 'Événement dans',
  },
  en: {
    device: 'Planets',
    visible: 'Planets visible tonight',
    count: 'Visible planets',
    brightest: 'Brightest planet',
    conjunction: 'Next conjunction',
    conjunctionDays: 'Conjunction in',
    separation: 'Separation (conjunction)',
    event: 'Next planetary event',
    eventDays: 'Event in',
  },
};

export const planets = {
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
        text(ids, 'visible-tonight', n.visible),
        counter(ids, 'visible-count', n.count, 5),
        text(ids, 'brightest', n.brightest),
        text(ids, 'conjunction-next', n.conjunction),
        duration(ids, 'conjunction-next-days', n.conjunctionDays, UNITS.DAYS, 400),
        angle(ids, 'conjunction-next-separation', n.separation, 10),
        text(ids, 'event-next', n.event),
        duration(ids, 'event-next-days', n.eventDays, UNITS.DAYS, 1000),
      ],
    };
  },

  states(gladys, snapshot, fmt) {
    const ids = gladys.externalIds(DEVICE_TYPE, PLATFORM_ID);
    const { night, live } = snapshot;
    if (!night || !live) {
      return [];
    }
    const list = night.planets ?? [];
    const conjunction = live.nextConjunction;
    return toStates([
      [ids.feature('visible-tonight'), fmt.planets(list)],
      [ids.feature('visible-count'), list.length],
      [ids.feature('brightest'), list[0]?.body ?? NONE],
      [ids.feature('conjunction-next'), fmt.conjunction(conjunction)],
      [ids.feature('conjunction-next-days'), live.conjunctionDays],
      [ids.feature('conjunction-next-separation'), conjunction?.separation ?? null],
      [ids.feature('event-next'), fmt.planetEvent(live.nextPlanetEvent)],
      [ids.feature('event-next-days'), live.planetEventDays],
    ]);
  },
};
