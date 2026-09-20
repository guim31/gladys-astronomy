// Device: meteor showers, active now and the next peak.
import {
  PLATFORM_ID,
  UNITS,
  pick,
  text,
  duration,
  level,
  flag,
  counter,
  toStates,
} from './common.js';

export const DEVICE_TYPE = 'astronomy-meteors';

const NAMES = {
  fr: {
    device: 'Étoiles filantes',
    active: 'Pluie active',
    activeFlag: 'Pluie en cours',
    peakTonight: 'Pic cette nuit',
    next: 'Prochain pic',
    nextDays: 'Prochain pic dans',
    nextZhr: 'ZHR du prochain pic',
    nextMoon: 'Lune au prochain pic',
  },
  en: {
    device: 'Meteor showers',
    active: 'Active shower',
    activeFlag: 'Shower in progress',
    peakTonight: 'Peak tonight',
    next: 'Next peak',
    nextDays: 'Next peak in',
    nextZhr: 'ZHR of the next peak',
    nextMoon: 'Moon at the next peak',
  },
};

export const meteors = {
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
        text(ids, 'active', n.active),
        flag(ids, 'active-flag', n.activeFlag, { history: true }),
        flag(ids, 'peak-tonight', n.peakTonight, { history: true }),
        text(ids, 'next-peak', n.next),
        duration(ids, 'next-peak-days', n.nextDays, UNITS.DAYS, 400),
        counter(ids, 'next-peak-zhr', n.nextZhr, 200),
        level(ids, 'next-peak-moon', n.nextMoon, { unit: UNITS.PERCENT, history: false }),
      ],
    };
  },

  states(gladys, snapshot, fmt) {
    const ids = gladys.externalIds(DEVICE_TYPE, PLATFORM_ID);
    const { night, live } = snapshot;
    if (!night || !live) {
      return [];
    }
    const active = night.activeShowers?.[0] ?? null;
    const next = night.nextPeak;
    return toStates([
      [ids.feature('active'), fmt.activeShower(active)],
      [ids.feature('active-flag'), Boolean(active)],
      [ids.feature('peak-tonight'), Boolean(night.peakTonight)],
      [ids.feature('next-peak'), fmt.nextPeak(next)],
      [ids.feature('next-peak-days'), live.nextPeakDays],
      [ids.feature('next-peak-zhr'), next?.zhr ?? null],
      [ids.feature('next-peak-moon'), next?.moon?.illumination ?? null],
    ]);
  },
};
