// Widget "Tonight": sky quality over the night, the moonless window, planets.
import { localize, message, iso } from './common.js';

export const KEY = 'astro_tonight';

export function build(snapshot, { language }) {
  const { fmt, s } = localize(language);
  const { night, live } = snapshot ?? {};
  if (!night || !live) {
    return message(s.noLocation);
  }
  if (!night.night) {
    return message(s.noNight, 1800);
  }
  const { twilights, moonless, curve = [] } = night;
  const components = [
    {
      type: 'text',
      variant: 'caption',
      text: s.nightOf(fmt.date(night.night.start), fmt.num(night.bestScore, 1)),
    },
    {
      type: 'gauge',
      value: live.skyScore,
      min: 0,
      max: 10,
      label: s.skyNow,
      color: live.skyScore >= 7 ? 'success' : live.skyScore >= 3 ? 'info' : 'neutral',
    },
    {
      type: 'value',
      value: moonless ? fmt.time(moonless.start) : '—',
      label: s.moonlessFrom,
      icon: 'moon',
    },
    {
      type: 'value',
      value: moonless ? fmt.duration(moonless.minutes) : '—',
      label: s.moonlessLength,
      icon: 'clock',
    },
    {
      type: 'value',
      value: Math.round(live.moonIllumination),
      unit: '%',
      label: s.moon,
      icon: 'circle',
    },
    {
      type: 'value',
      value: night.planets?.length ?? 0,
      label: s.planets,
      icon: 'globe',
    },
  ];

  const annotations = [
    [twilights.civil.dusk, s.civilDusk, 'neutral'],
    [twilights.astronomical.dusk, s.astroDusk, 'primary'],
    [moonless?.start, s.moonlessStart, 'success'],
    [twilights.astronomical.dawn, s.astroDawn, 'neutral'],
  ]
    .filter(([t]) => t)
    .map(([t, label, color]) => ({ t: iso(t), label, color }));
  if (curve.length > 0) {
    components.push({
      type: 'chart',
      chart_type: 'area',
      title: s.skyQuality,
      unit: '/10',
      series: [{ name: s.skyQuality, points: curve.map((p) => ({ t: iso(p.t), v: p.score })) }],
      annotations,
      now_marker: true,
    });
  }

  const items = (night.planets ?? []).slice(0, 5).map((p) => ({
    label: fmt.body(p.body),
    value: `${fmt.time(p.from)} → ${fmt.time(p.to)} · mag ${fmt.num(p.magnitude, 1)}`,
    icon: 'circle',
    color: 'info',
  }));
  if (items.length === 0) {
    items.push({ label: s.planets, value: s.noPlanet, color: 'neutral' });
  }
  const shower = night.activeShowers?.[0];
  if (shower) {
    items.push({
      label: s.shower,
      value: `${fmt.showerName(shower)} · ZHR ${shower.zhr}`,
      icon: 'star',
      color: 'primary',
    });
  }
  components.push({ type: 'status', items });
  return { version: 1, ttl_seconds: 300, components };
}
