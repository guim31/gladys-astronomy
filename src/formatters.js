// -----------------------------------------------------------------------------
// Human-readable texts of the sensors, in the configured language.
//
// The only place that formats dates and numbers: it reads the container's
// `TZ` (injected by the Gladys supervisor from the system timezone) through
// `Intl`. Texts are never empty (the core drops an empty `text` state): `—`
// stands for "nothing to show".
// -----------------------------------------------------------------------------

export const NONE = '—';

const LOCALES = { fr: 'fr-FR', en: 'en-GB' };

const T = {
  fr: {
    solar: 'Solaire',
    lunar: 'Lunaire',
    max: 'max',
    kind: { partial: 'partielle', annular: 'annulaire', total: 'totale', penumbral: 'pénombrale' },
    body: {
      sun: 'Soleil',
      moon: 'Lune',
      mercury: 'Mercure',
      venus: 'Vénus',
      mars: 'Mars',
      jupiter: 'Jupiter',
      saturn: 'Saturne',
    },
    transit: 'Transit de',
    visible: 'visible',
    notVisible: 'sous l’horizon',
    noPlanet: 'Aucune planète à l’œil nu',
    evening: 'soir',
    morning: 'matin',
    opposition: 'Opposition de',
    elongation: 'Élongation max. de',
    noShower: 'Aucune pluie active',
    zhr: 'ZHR',
    peak: 'pic',
    moon: 'Lune',
    radiant: 'radiant',
    moonLevel: {
      none: 'sans Lune',
      low: 'Lune faible',
      medium: 'Lune gênante',
      high: 'pleine Lune',
    },
    night: 'Nuit',
    level: { astronomical: 'astronomique', nautical: 'nautique', civil: 'civile', none: 'solaire' },
    moonless: 'sans Lune',
    noMoonless: 'pas de fenêtre sans Lune',
    score: 'score',
    noNight: 'Pas de nuit (soleil de minuit)',
    season: {
      'march-equinox': 'Équinoxe de printemps',
      'june-solstice': 'Solstice d’été',
      'september-equinox': 'Équinoxe d’automne',
      'december-solstice': 'Solstice d’hiver',
    },
    apsis: { perihelion: 'Périhélie', aphelion: 'Aphélie' },
    mkm: 'M km',
    kpForecast: 'prévu',
    noAlert: 'Aucune alerte sous 3 jours',
    today: 'Aujourd’hui',
    tomorrow: 'Demain',
    dayAfter: 'J+2',
    unavailable: 'Indisponible',
    cache: 'cache',
    conjunctionSep: 'séparation',
  },
  en: {
    solar: 'Solar',
    lunar: 'Lunar',
    max: 'max',
    kind: { partial: 'partial', annular: 'annular', total: 'total', penumbral: 'penumbral' },
    body: {
      sun: 'Sun',
      moon: 'Moon',
      mercury: 'Mercury',
      venus: 'Venus',
      mars: 'Mars',
      jupiter: 'Jupiter',
      saturn: 'Saturn',
    },
    transit: 'Transit of',
    visible: 'visible',
    notVisible: 'below the horizon',
    noPlanet: 'No naked-eye planet',
    evening: 'evening',
    morning: 'morning',
    opposition: 'Opposition of',
    elongation: 'Greatest elongation of',
    noShower: 'No active shower',
    zhr: 'ZHR',
    peak: 'peak',
    moon: 'Moon',
    radiant: 'radiant',
    moonLevel: { none: 'moonless', low: 'faint Moon', medium: 'bright Moon', high: 'full Moon' },
    night: 'Night',
    level: { astronomical: 'astronomical', nautical: 'nautical', civil: 'civil', none: 'solar' },
    moonless: 'moonless',
    noMoonless: 'no moonless window',
    score: 'score',
    noNight: 'No night (midnight sun)',
    season: {
      'march-equinox': 'March equinox',
      'june-solstice': 'June solstice',
      'september-equinox': 'September equinox',
      'december-solstice': 'December solstice',
    },
    apsis: { perihelion: 'Perihelion', aphelion: 'Aphelion' },
    mkm: 'M km',
    kpForecast: 'forecast',
    noAlert: 'No alert within 3 days',
    today: 'Today',
    tomorrow: 'Tomorrow',
    dayAfter: 'Day +2',
    unavailable: 'Unavailable',
    cache: 'cache',
    conjunctionSep: 'separation',
  },
};

/**
 * @param {string} language requested language (ISO 639-1)
 * @param {string} timeZone IANA zone, the container's TZ by default
 * @param {{ fallback?: 'fr'|'en' }} options language used when `language` is
 *   not supported: French for the device texts (the config default), English
 *   for the widgets (Gladys' own fallback for a user language).
 */
export function createFormatter(
  language = 'fr',
  timeZone = process.env.TZ || 'UTC',
  { fallback = 'fr' } = {},
) {
  const lang = T[language] ? language : fallback;
  const t = T[lang];
  const locale = LOCALES[lang];
  const dateFmt = new Intl.DateTimeFormat(locale, {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeFmt = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const numberFmt = (decimals) =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: decimals });

  const date = (d) => (d ? dateFmt.format(d) : NONE);
  const time = (d) => (d ? timeFmt.format(d) : NONE);
  const dateTime = (d) => (d ? `${date(d)} ${time(d)}` : NONE);
  const num = (value, decimals = 1) =>
    Number.isFinite(value) ? numberFmt(decimals).format(value) : NONE;
  const body = (key) => t.body[key] ?? key;
  const duration = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
  };

  return {
    t,
    language: lang,
    date,
    time,
    dateTime,
    num,
    body,
    duration,

    solarEclipse(e) {
      if (!e) {
        return NONE;
      }
      const pct = `${num(e.obscuration * 100, 0)} %`;
      const total = e.totalBegin ? ` · ${time(e.totalBegin)}–${time(e.totalEnd)}` : '';
      return (
        `${t.solar} · ${date(e.peak)} · ${t.kind[e.kind]} ${pct} · ` +
        `${time(e.partialBegin)} → ${time(e.partialEnd)} (${t.max} ${time(e.peak)})${total}`
      );
    },

    lunarEclipse(e) {
      if (!e) {
        return NONE;
      }
      const total = e.totalBegin ? ` · ${time(e.totalBegin)}–${time(e.totalEnd)}` : '';
      return (
        `${t.lunar} · ${date(e.peak)} · ${t.kind[e.kind]} · ` +
        `${time(e.begin)} → ${time(e.end)} (${t.max} ${time(e.peak)})${total} · ` +
        `${t.visible} ${time(e.visibleFrom)} → ${time(e.visibleTo)}`
      );
    },

    transit(tr) {
      if (!tr) {
        return NONE;
      }
      const vis = tr.visible ? t.visible : t.notVisible;
      return `${t.transit} ${body(tr.body)} · ${date(tr.peak)} · ${time(tr.start)} → ${time(tr.finish)} · ${vis}`;
    },

    planets(list) {
      if (!list?.length) {
        return t.noPlanet;
      }
      return list
        .map(
          (p) =>
            `${body(p.body)} ${num(p.magnitude, 1)} (${time(p.from)} → ${time(p.to)}, ${p.constellation})`,
        )
        .join(' · ');
    },

    conjunction(c) {
      if (!c) {
        return NONE;
      }
      const vis = c.visible ? t.visible : t.notVisible;
      return `${body(c.bodies[0])} – ${body(c.bodies[1])} · ${num(c.separation, 1)}° · ${dateTime(c.time)} · ${vis}`;
    },

    planetEvent(e) {
      if (!e) {
        return NONE;
      }
      if (e.kind === 'opposition') {
        return `${t.opposition} ${body(e.body)} · ${date(e.time)}`;
      }
      return `${t.elongation} ${body(e.body)} (${t[e.visibility]}, ${num(e.elongation, 0)}°) · ${date(e.time)}`;
    },

    showerName(s) {
      return s.name[lang] ?? s.name.en;
    },

    activeShower(s) {
      if (!s) {
        return t.noShower;
      }
      const moon = s.moon ? ` · ${t.moon} ${num(s.moon.illumination, 0)} %` : '';
      const radiant =
        Number.isFinite(s.radiantAltitude) && s.radiantAltitude > 0
          ? ` · ${t.radiant} ${num(s.radiantAltitude, 0)}°`
          : '';
      return `${this.showerName(s)} · ${t.zhr} ${s.zhr} · ${t.peak} ${dateTime(s.peak)}${moon}${radiant}`;
    },

    nextPeak(s) {
      if (!s) {
        return NONE;
      }
      const moon = s.moon
        ? ` · ${t.moonLevel[s.moon.level]} (${num(s.moon.illumination, 0)} %)`
        : '';
      return `${this.showerName(s)} · ${dateTime(s.peak)} · ${t.zhr} ${s.zhr}${moon}`;
    },

    nightSummary(n) {
      if (!n?.night) {
        return t.noNight;
      }
      const dark = `${t.night} ${t.level[n.darkest.level]} ${time(n.darkest.start)} → ${time(n.darkest.end)}`;
      const moonless = n.moonless
        ? `${t.moonless} ${time(n.moonless.start)} → ${time(n.moonless.end)} (${duration(n.moonless.minutes)})`
        : t.noMoonless;
      return `${dark} · ${moonless} · ${t.score} ${num(n.bestScore, 1)}/10`;
    },

    season(s) {
      return s ? `${t.season[s.kind]} · ${dateTime(s.time)}` : NONE;
    },

    apsis(a) {
      return a
        ? `${t.apsis[a.kind]} · ${date(a.time)} · ${num(a.distanceKm / 1e6, 1)} ${t.mkm}`
        : NONE;
    },

    auroraNextAlert(summary) {
      if (!summary?.nextAlert) {
        return t.noAlert;
      }
      const { start, end, kp } = summary.nextAlert;
      return `Kp ${num(kp, 2)} ${t.kpForecast} · ${date(start)} ${time(start)}–${time(end)}`;
    },

    auroraForecast(summary) {
      if (!summary?.daily?.length) {
        return NONE;
      }
      const labels = [t.today, t.tomorrow, t.dayAfter];
      return summary.daily.map((d, i) => `${labels[i]} ${num(d.kp, 2)}`).join(' · ');
    },

    auroraUpdated(aurora) {
      if (!aurora?.fetchedAt) {
        return t.unavailable;
      }
      return `${dateTime(aurora.fetchedAt)} (${aurora.source === 'cache' ? t.cache : 'NOAA'})`;
    },
  };
}
