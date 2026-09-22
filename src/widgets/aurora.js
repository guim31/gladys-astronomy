// Widget "Aurora": the NOAA Kp index, observed and forecast.
import { localize, message, iso } from './common.js';

export const KEY = 'astro_aurora';

const LEVEL_COLORS = ['success', 'info', 'warning', 'danger'];
const HOUR_MS = 3600 * 1000;

function kpColor(kp, alertKp) {
  if (!Number.isFinite(kp)) {
    return 'neutral';
  }
  if (kp >= 7) {
    return 'danger';
  }
  return kp >= alertKp ? 'warning' : kp >= 4 ? 'info' : 'success';
}

export function build(snapshot, { language, now, config }) {
  const { fmt, s } = localize(language);
  if (!config?.aurora_enabled) {
    return message(s.auroraDisabled, 3600);
  }
  const aurora = snapshot?.aurora;
  const summary = aurora?.summary;
  if (!summary) {
    return message(snapshot?.aurora ? s.auroraUnavailable : s.noLocation, 600);
  }
  const alertKp = config.aurora_kp_alert;
  const tile = (value, label) => ({
    type: 'value',
    value: Number.isFinite(value) ? value : '—',
    label,
    color: kpColor(value, alertKp),
  });
  const from = now.getTime() - 48 * HOUR_MS;
  const to = now.getTime() + 72 * HOUR_MS;
  const points = (aurora.rows ?? [])
    .filter((r) => r.time.getTime() >= from && r.time.getTime() <= to)
    .map((r) => ({ t: iso(r.time), v: r.kp }));
  const components = [
    tile(summary.kpNow, s.kpNow),
    tile(summary.kpMax24h, s.kpMax24),
    tile(summary.kpMax72h, s.kpMax72),
  ];
  if (points.length > 0) {
    components.push({
      type: 'chart',
      chart_type: 'bar',
      title: s.kpSeries,
      series: [{ name: 'Kp', points }],
      annotations: summary.nextAlert
        ? [
            {
              t: iso(summary.nextAlert.start),
              value: summary.nextAlert.kp,
              label: s.alert,
              color: 'warning',
            },
          ]
        : [],
      now_marker: true,
    });
  }
  components.push({
    type: 'status',
    items: [
      {
        label: s.alertLevel,
        value: s.levels[summary.alertLevel] ?? s.levels[0],
        color: LEVEL_COLORS[summary.alertLevel] ?? 'neutral',
      },
      {
        label: s.nextAlert,
        value: summary.nextAlert
          ? `Kp ${fmt.num(summary.nextAlert.kp, 1)} · ${fmt.dateTime(summary.nextAlert.start)}`
          : s.none,
        color: summary.nextAlert ? 'warning' : 'neutral',
      },
      {
        label: s.source,
        value: fmt.auroraUpdated(aurora),
        color: aurora.source === 'noaa' ? 'success' : 'warning',
      },
    ],
  });
  return { version: 1, ttl_seconds: 1800, components };
}
