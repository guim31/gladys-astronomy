// -----------------------------------------------------------------------------
// Texts of the dashboard widgets, the agenda and the scene payloads, on top of
// the sensor texts of src/formatters.js. Widget labels are bounded by the
// core (tile label 24, status label 40, card title 60, badge 16): keep them
// short.
// -----------------------------------------------------------------------------

export const STRINGS = {
  fr: {
    noLocation: 'Localisez votre maison dans Gladys (Paramètres > Maisons) pour voir le ciel.',
    solarEclipse: (kind) => `Éclipse ${kind} de Soleil`,
    lunarEclipse: (kind) => `Éclipse ${kind} de Lune`,
    meteorPeak: (name) => `Pic des ${name}`,
    conjunction: 'Conjonction',
    visible: 'visible',
    notVisible: 'non visible',
    inDays: (days) => (days < 1 ? 'Aujourd’hui' : days < 2 ? 'Demain' : `J-${Math.floor(days)}`),
    nightOf: (date, score) => `Nuit du ${date} · meilleur ciel ${score}/10`,
    skyNow: 'Ciel maintenant',
    moonlessFrom: 'Sans Lune dès',
    moonlessLength: 'Durée sans Lune',
    moon: 'Lune',
    planets: 'Planètes',
    noPlanet: 'aucune à l’œil nu',
    skyQuality: 'Qualité du ciel',
    civilDusk: 'Crépuscule',
    astroDusk: 'Nuit noire',
    astroDawn: 'Aube',
    moonlessStart: 'Sans Lune',
    shower: 'Pluie active',
    noNight: 'Pas de nuit : le Soleil ne se couche pas.',
    agendaCaption: (count, days) => `${count} événement${count > 1 ? 's' : ''} · ${days} jours`,
    agendaEmpty: 'Aucun événement dans cette période.',
    kpNow: 'Kp actuel',
    kpMax24: 'Kp max 24 h',
    kpMax72: 'Kp max 72 h',
    kpSeries: 'Indice Kp',
    alert: 'Alerte',
    alertLevel: 'Niveau',
    levels: ['Calme', 'Actif', 'Orage', 'Orage fort'],
    nextAlert: 'Prochaine alerte',
    source: 'Données',
    auroraDisabled: 'Prévision d’aurores désactivée dans la configuration de l’intégration.',
    auroraUnavailable: 'La NOAA ne répond pas et aucune donnée récente n’est en cache.',
    eclipseIn: 'Dans',
    obscuration: 'Obscuration',
    altitudeAtPeak: 'Hauteur au max',
    date: 'Date',
    partialBegin: 'Début',
    totalBegin: 'Totalité',
    peak: 'Maximum',
    end: 'Fin',
    visibleFromTo: 'Visible',
    eclipseBody: (e, fmt) =>
      e.body === 'sun'
        ? `Le Soleil sera caché à ${fmt.num(e.obscuration * 100, 0)} % au maximum, à ${fmt.num(e.altitude, 0)}° au-dessus de l’horizon. Ne jamais regarder sans filtre homologué.`
        : `La Lune sera à ${fmt.num(e.altitude, 0)}° au-dessus de l’horizon au maximum. Observable à l’œil nu.`,
    daysUnit: 'j',
    none: 'aucun',
  },
  en: {
    noLocation: 'Set the location of your house in Gladys (Settings > Houses) to see the sky.',
    solarEclipse: (kind) => `${capitalize(kind)} solar eclipse`,
    lunarEclipse: (kind) => `${capitalize(kind)} lunar eclipse`,
    meteorPeak: (name) => `${name} peak`,
    conjunction: 'Conjunction',
    visible: 'visible',
    notVisible: 'not visible',
    inDays: (days) => (days < 1 ? 'Today' : days < 2 ? 'Tomorrow' : `In ${Math.floor(days)} d`),
    nightOf: (date, score) => `Night of ${date} · best sky ${score}/10`,
    skyNow: 'Sky now',
    moonlessFrom: 'Moonless from',
    moonlessLength: 'Moonless for',
    moon: 'Moon',
    planets: 'Planets',
    noPlanet: 'none to the naked eye',
    skyQuality: 'Sky quality',
    civilDusk: 'Dusk',
    astroDusk: 'Dark sky',
    astroDawn: 'Dawn',
    moonlessStart: 'Moonless',
    shower: 'Active shower',
    noNight: 'No night: the Sun does not set.',
    agendaCaption: (count, days) => `${count} event${count > 1 ? 's' : ''} · ${days} days`,
    agendaEmpty: 'Nothing in this period.',
    kpNow: 'Kp now',
    kpMax24: 'Kp max 24 h',
    kpMax72: 'Kp max 72 h',
    kpSeries: 'Kp index',
    alert: 'Alert',
    alertLevel: 'Level',
    levels: ['Quiet', 'Active', 'Storm', 'Strong storm'],
    nextAlert: 'Next alert',
    source: 'Data',
    auroraDisabled: 'The aurora forecast is turned off in the integration configuration.',
    auroraUnavailable: 'NOAA does not answer and no recent data is cached.',
    eclipseIn: 'In',
    obscuration: 'Obscuration',
    altitudeAtPeak: 'Altitude at max',
    date: 'Date',
    partialBegin: 'Begins',
    totalBegin: 'Totality',
    peak: 'Maximum',
    end: 'Ends',
    visibleFromTo: 'Visible',
    eclipseBody: (e, fmt) =>
      e.body === 'sun'
        ? `Up to ${fmt.num(e.obscuration * 100, 0)} % of the Sun hidden, ${fmt.num(e.altitude, 0)}° above the horizon at maximum. Never look without a certified filter.`
        : `The Moon will be ${fmt.num(e.altitude, 0)}° above the horizon at maximum. Visible to the naked eye.`,
    daysUnit: 'd',
    none: 'none',
  },
};

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function strings(language) {
  return STRINGS[language] ?? STRINGS.en;
}
