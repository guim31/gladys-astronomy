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
    inDays: (days) => (days === 0 ? 'Aujourd’hui' : days === 1 ? 'Demain' : `J-${days}`),
    nightOf: (date, score) => `Nuit du ${date} · meilleur ciel ${score}/10`,
    skyNow: 'Ciel maintenant',
    moonlessFrom: 'Sans Lune dès',
    moonlessLength: 'Ciel noir',
    moon: 'Lune',
    planets: 'Planètes',
    noPlanet: 'aucune à l’œil nu',
    skyQuality: 'Qualité du ciel',
    astroDusk: 'Nuit noire',
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
    inDays: (days) => (days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} d`),
    nightOf: (date, score) => `Night of ${date} · best sky ${score}/10`,
    skyNow: 'Sky now',
    moonlessFrom: 'Moonless from',
    moonlessLength: 'Dark sky',
    moon: 'Moon',
    planets: 'Planets',
    noPlanet: 'none to the naked eye',
    skyQuality: 'Sky quality',
    astroDusk: 'Dark sky',
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
  de: {
    noLocation:
      'Lege den Standort deines Zuhauses in Gladys fest (Einstellungen > Zuhause), um den Himmel zu sehen.',
    solarEclipse: (kind) => germanEclipse(kind, 'Sonnenfinsternis'),
    lunarEclipse: (kind) => germanEclipse(kind, 'Mondfinsternis'),
    meteorPeak: (name) => `Maximum der ${name}`,
    conjunction: 'Konjunktion',
    visible: 'sichtbar',
    notVisible: 'nicht sichtbar',
    inDays: (days) => (days === 0 ? 'Heute' : days === 1 ? 'Morgen' : `in ${days} Tagen`),
    nightOf: (date, score) => `Nacht vom ${date} · bester Himmel ${score}/10`,
    skyNow: 'Himmel jetzt',
    moonlessFrom: 'Mondlos ab',
    moonlessLength: 'Dunkler Himmel',
    moon: 'Mond',
    planets: 'Planeten',
    noPlanet: 'keiner mit bloßem Auge',
    skyQuality: 'Himmelsqualität',
    astroDusk: 'Volle Dunkelheit',
    moonlessStart: 'Mondlos',
    shower: 'Aktiver Strom',
    noNight: 'Keine Nacht: Die Sonne geht nicht unter.',
    agendaCaption: (count, days) => `${count} Ereignis${count > 1 ? 'se' : ''} · ${days} Tage`,
    agendaEmpty: 'Keine Ereignisse in diesem Zeitraum.',
    kpNow: 'Kp aktuell',
    kpMax24: 'Kp max. 24 h',
    kpMax72: 'Kp max. 72 h',
    kpSeries: 'Kp-Index',
    alert: 'Alarm',
    alertLevel: 'Stufe',
    levels: ['Ruhig', 'Aktiv', 'Sturm', 'Starker Sturm'],
    nextAlert: 'Nächster Alarm',
    source: 'Daten',
    auroraDisabled:
      'Die Polarlichtvorhersage ist in der Konfiguration der Integration ausgeschaltet.',
    auroraUnavailable: 'Die NOAA antwortet nicht und es sind keine aktuellen Daten im Cache.',
    eclipseIn: 'In',
    obscuration: 'Bedeckung',
    altitudeAtPeak: 'Höhe im Maximum',
    date: 'Datum',
    partialBegin: 'Beginn',
    totalBegin: 'Totalität',
    peak: 'Maximum',
    end: 'Ende',
    visibleFromTo: 'Sichtbar',
    eclipseBody: (e, fmt) =>
      e.body === 'sun'
        ? `Bis zu ${fmt.num(e.obscuration * 100, 0)} % der Sonne verdeckt, im Maximum ${fmt.num(e.altitude, 0)}° über dem Horizont. Schau niemals ohne zertifizierten Filter hin.`
        : `Der Mond steht im Maximum ${fmt.num(e.altitude, 0)}° über dem Horizont. Mit bloßem Auge sichtbar.`,
    daysUnit: 'T',
    none: 'keiner',
  },
  es: {
    noLocation:
      'Indique la ubicación de su vivienda en Gladys (Configuración > Viviendas) para ver el cielo.',
    solarEclipse: (kind) => `Eclipse solar ${kind}`,
    lunarEclipse: (kind) => `Eclipse lunar ${kind}`,
    meteorPeak: (name) => `Máximo de las ${name}`,
    conjunction: 'Conjunción',
    visible: 'visible',
    notVisible: 'no visible',
    inDays: (days) => (days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `en ${days} días`),
    nightOf: (date, score) => `Noche del ${date} · mejor cielo ${score}/10`,
    skyNow: 'Cielo ahora',
    moonlessFrom: 'Sin Luna desde',
    moonlessLength: 'Cielo oscuro',
    moon: 'Luna',
    planets: 'Planetas',
    noPlanet: 'ninguno a simple vista',
    skyQuality: 'Calidad del cielo',
    astroDusk: 'Noche cerrada',
    moonlessStart: 'Sin Luna',
    shower: 'Lluvia activa',
    noNight: 'Sin noche: el Sol no se pone.',
    agendaCaption: (count, days) => `${count} evento${count > 1 ? 's' : ''} · ${days} días`,
    agendaEmpty: 'Ningún evento en este periodo.',
    kpNow: 'Kp actual',
    kpMax24: 'Kp máx. 24 h',
    kpMax72: 'Kp máx. 72 h',
    kpSeries: 'Índice Kp',
    alert: 'Alerta',
    alertLevel: 'Nivel',
    levels: ['Calma', 'Activo', 'Tormenta', 'Tormenta fuerte'],
    nextAlert: 'Próxima alerta',
    source: 'Datos',
    auroraDisabled:
      'La previsión de auroras está desactivada en la configuración de la integración.',
    auroraUnavailable: 'La NOAA no responde y no hay datos recientes en caché.',
    eclipseIn: 'Dentro de',
    obscuration: 'Oscurecimiento',
    altitudeAtPeak: 'Altura en el máximo',
    date: 'Fecha',
    partialBegin: 'Inicio',
    totalBegin: 'Totalidad',
    peak: 'Máximo',
    end: 'Fin',
    visibleFromTo: 'Visible',
    eclipseBody: (e, fmt) =>
      e.body === 'sun'
        ? `Hasta un ${fmt.num(e.obscuration * 100, 0)} % del Sol oculto, a ${fmt.num(e.altitude, 0)}° sobre el horizonte en el máximo. No mire nunca sin un filtro homologado.`
        : `La Luna estará a ${fmt.num(e.altitude, 0)}° sobre el horizonte en el máximo. Visible a simple vista.`,
    daysUnit: 'd',
    none: 'ninguna',
  },
};

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// German adjectives decline before the noun: "partiell" -> "Partielle
// Sonnenfinsternis"; the penumbral kind is a compound noun.
const GERMAN_KIND = { partiell: 'Partielle', ringförmig: 'Ringförmige', total: 'Totale' };

function germanEclipse(kind, noun) {
  return GERMAN_KIND[kind] ? `${GERMAN_KIND[kind]} ${noun}` : `${kind}-${noun}`;
}

export function strings(language) {
  return STRINGS[language] ?? STRINGS.en;
}
