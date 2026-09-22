// Widget "Next eclipse": countdown and phases of the next visible eclipse.
import { localize, message, daysBetween } from './common.js';

export const KEY = 'astro_eclipse';

export const KINDS = ['any', 'solar', 'lunar'];

/**
 * The eclipse to show, normalized: { body, kind, start, peak, end, obscuration,
 * altitude, phases: [[labelKey, Date|[Date, Date]]] }.
 */
export function pickEclipse(rare, kind) {
  const solar = rare.solar
    ? {
        body: 'sun',
        kind: rare.solar.kind,
        start: rare.solar.partialBegin,
        peak: rare.solar.peak,
        end: rare.solar.partialEnd,
        obscuration: rare.solar.obscuration,
        altitude: rare.solar.peakAltitude,
        phases: [
          ['partialBegin', rare.solar.partialBegin],
          [
            'totalBegin',
            rare.solar.totalBegin ? [rare.solar.totalBegin, rare.solar.totalEnd] : null,
          ],
          ['peak', rare.solar.peak],
          ['end', rare.solar.partialEnd],
        ],
      }
    : null;
  const lunar = rare.lunar
    ? {
        body: 'moon',
        kind: rare.lunar.kind,
        start: rare.lunar.begin,
        peak: rare.lunar.peak,
        end: rare.lunar.end,
        obscuration: rare.lunar.obscuration,
        altitude: rare.lunar.moonAltitudeAtPeak,
        phases: [
          ['partialBegin', rare.lunar.begin],
          [
            'totalBegin',
            rare.lunar.totalBegin ? [rare.lunar.totalBegin, rare.lunar.totalEnd] : null,
          ],
          ['peak', rare.lunar.peak],
          ['end', rare.lunar.end],
          ['visibleFromTo', [rare.lunar.visibleFrom, rare.lunar.visibleTo]],
        ],
      }
    : null;
  if (kind === 'solar') {
    return solar;
  }
  if (kind === 'lunar') {
    return lunar;
  }
  return [solar, lunar].filter(Boolean).sort((a, b) => a.start - b.start)[0] ?? null;
}

export function build(snapshot, { settings = {}, language, now }) {
  const { fmt, s } = localize(language);
  if (!snapshot?.rare) {
    return message(s.noLocation);
  }
  const kind = KINDS.includes(settings.kind) ? settings.kind : 'any';
  const e = pickEclipse(snapshot.rare, kind);
  if (!e) {
    return message(s.agendaEmpty, 3600);
  }
  const title =
    e.body === 'sun' ? s.solarEclipse(fmt.t.kind[e.kind]) : s.lunarEclipse(fmt.t.kind[e.kind]);
  const days = daysBetween(e.start, now);
  const items = [{ label: s.date, value: fmt.date(e.peak), icon: 'calendar', color: 'primary' }];
  for (const [key, when] of e.phases) {
    if (!when) {
      continue;
    }
    const value = Array.isArray(when)
      ? `${fmt.time(when[0])} → ${fmt.time(when[1])}`
      : fmt.time(when);
    items.push({ label: s[key], value, color: key === 'peak' ? 'warning' : 'neutral' });
  }
  return {
    version: 1,
    ttl_seconds: 3600,
    components: [
      { type: 'text', variant: 'heading', text: title },
      {
        type: 'value',
        value: days < 1 ? s.inDays(days) : Math.floor(days),
        unit: days < 1 ? undefined : s.daysUnit,
        label: s.eclipseIn,
        icon: 'clock',
        color: days <= 7 ? 'warning' : 'primary',
      },
      {
        type: 'gauge',
        value: Math.round(e.obscuration * 100),
        min: 0,
        max: 100,
        unit: '%',
        label: s.obscuration,
        color: e.kind === 'total' ? 'danger' : 'warning',
      },
      {
        type: 'value',
        value: Math.round(e.altitude),
        unit: '°',
        label: s.altitudeAtPeak,
        icon: e.body === 'sun' ? 'sun' : 'moon',
      },
      { type: 'status', items },
      { type: 'text', variant: 'body', text: s.eclipseBody(e, fmt) },
    ],
  };
}
