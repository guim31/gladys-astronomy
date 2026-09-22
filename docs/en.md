# Astronomy for Gladys Assistant

This integration computes, for your home, what is happening in the sky: the
next eclipses, the planets visible tonight, meteor showers, the moonless
dark-sky window, the seasons and an aurora outlook. Everything is computed
**locally**, without any key or account: the only outgoing connection is the
NOAA space weather service for the aurora Kp index, and it can be turned off.

The integration brings three things:

- **six devices** with text and numeric sensors, kept in history and usable in scenes
  with thresholds;
- **four dashboard widgets**, shown in the language of each user;
- **six scene triggers and two scene actions**: "an eclipse begins", "the dark sky
  begins", "what is the next event?"…

## Requirements

- **Gladys 5.1 or later**: widgets and scenes from external integrations appeared in
  that version.
- **A located house in Gladys**: Settings → Houses → your house → drop the pin
  on the map. The integration reads those coordinates (it asks for the
  `location` access at install time). You can also type a latitude and a
  longitude in the configuration to observe from somewhere else.
- **The Gladys timezone**: Settings → System. Times in the text sensors are
  shown in that timezone; if it is not set, they are in UTC.

## The six devices

| Device                | What it gives                                                                                                                                                                                                                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Eclipses**          | Next solar eclipse visible from your place (kind, obscuration, begin, maximum and end times), next visible lunar eclipse (kind, times, period with the Moon up), next transit of Mercury or Venus, countdowns in days, an "eclipse today" flag.                                                                                        |
| **Planets**           | Naked-eye planets up tonight with magnitude, hours and constellation; the brightest one; next conjunction (Moon–planet or planet–planet), its separation and whether it is observable; next opposition or greatest elongation.                                                                                                         |
| **Meteor showers**    | Active shower (ZHR, peak time, Moon interference, radiant altitude), "shower in progress" and "peak tonight" flags, next peak with its ZHR and the Moon illumination. Embedded calendar of 13 annual showers (Quadrantids, Lyrids, Eta Aquariids, Delta Aquariids, Perseids, Draconids, Orionids, Taurids, Leonids, Geminids, Ursids). |
| **Observing night**   | Civil, nautical and astronomical dusk, astronomical dawn, moonless dark window (start, length), "dark sky now" flag, sky quality score from 0 to 10 (instantaneous and best of the night), Moon illumination.                                                                                                                          |
| **Seasons and orbit** | Next equinox or solstice, day length and its daily change, next perihelion or aphelion, Earth-Sun distance.                                                                                                                                                                                                                            |
| **Aurora**            | Current Kp index, 24 h and 72 h maxima, alert level 0 to 3, alert flag, next period above your threshold, three-day forecast, time of the last NOAA update.                                                                                                                                                                            |

The "kind" sensors (`partial`, `total`, `september-equinox`…) carry neutral
values, identical in every language, to be tested in scenes.

## Dashboard widgets

When editing a dashboard, pick **Add a box → Integration widgets**.

| Widget            | What it shows                                                                                                                                                                                        | Settings                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Tonight's sky** | Sky quality curve over the whole night, with dusk, dark sky, moonless start and dawn markers; gauge of the sky now; time and length of the moonless window; Moon; visible planets and active shower. | none                                                |
| **Sky agenda**    | The next eight events, each with an "In 12 d" badge and a detail panel: eclipses, meteor peaks, conjunctions, oppositions, elongations, seasons, transits.                                           | kinds of events, period (30 days, 3 months, 1 year) |
| **Aurora**        | Kp now, 24 h and 72 h maxima colored by the threshold, observed and forecast bars, alert level and freshness of the NOAA data.                                                                       | none                                                |
| **Next eclipse**  | Countdown, obscuration, altitude at maximum, time of each phase.                                                                                                                                     | the next one, solar or lunar                        |

Conjunctions are searched over the window set in the configuration (90 days by
default): with the "1 year" period, the agenda shows none beyond it.

## Scene triggers and actions

In the scene editor, category **Integrations**:

| Trigger                     | When                                               | Possible filter                   |
| --------------------------- | -------------------------------------------------- | --------------------------------- |
| Eclipse begins or peaks     | at the start of the visible phase, then at maximum | Sun or Moon, beginning or maximum |
| Moonless dark sky begins    | when the moonless window starts                    | —                                 |
| Meteor shower peak tonight  | at dusk on the night of a peak                     | the shower (Perseids, Geminids…)  |
| Visible conjunction tonight | at dusk on the night of an observable approach     | with or without the Moon          |
| Aurora alert rises          | when the alert level goes up                       | the level reached                 |
| Season begins               | at the instant of the equinox or solstice          | the season                        |

Each trigger passes its details to the following actions (maximum time, ZHR,
separation, Kp, a ready-to-send description…), inserted with the variable picker.

Two actions return values to the next steps: **Next sky event** (filterable by kind)
and **Tonight's sky summary**. They have their own language field, since a scene has
no user.

Timed triggers are emitted by the integration container: if it is stopped at the
time, an event missed by less than 15 minutes is caught up on restart, older ones are
dropped.

## Configuration

- **Language of the texts**: French or English. Sensor names are set when the
  device is created; to rename them after a language change, delete and re-add
  the device.
- **Refresh of countdowns**: cadence of the moving values (days left, flags,
  instantaneous score). Rare events are recomputed every night at 03:00, the
  night every 30 minutes, the aurora every 30 minutes.
- **Conjunctions**: search window and maximum separation. The full Moon is
  0.5° wide; 3° is a pretty naked-eye pairing.
- **Minimum ZHR**: hides the small showers. 10 keeps the Draconids, Leonids and
  Ursids; 50 keeps only the Perseids, Geminids and Eta Aquariids.
- **Moonless window**: a Moon thinner than this percentage does not spoil the
  dark sky.
- **Bortle class**: light pollution of your site (1 pristine, 9 city centre).
  Lowers the sky quality score; 0 ignores it.
- **Aurora**: enable the NOAA device or not, and the Kp from which the alert
  rises. Kp 5 is a minor storm (aurora possible around 55° of latitude), Kp 7
  can reach central France.

## Scene ideas

- **Perseids night**: trigger "Meteor shower peak tonight" filtered on the Perseids,
  then a message with the description it passes on.
- **Never miss the eclipse**: trigger "Eclipse begins or peaks", moment "Beginning":
  notify everyone and open the shutters facing the sky.
- **Dark sky**: trigger "Moonless dark sky begins": switch the garden lights off when
  the best score passed on is above 8.
- **Aurora alert**: trigger "Aurora alert rises", level "Strong storm". For a precise
  threshold (Kp > 6), use the "Kp max next 24 h" sensor of the Aurora device in a
  device state trigger instead.
- **Astronomical good evening**: every evening at 8 pm, action "Tonight's sky summary"
  then a message with the summary.

## Good to know

- Sunrise and sunset are native in Gladys: they are not duplicated here.
- Penumbral lunar eclipses, nearly invisible, are ignored.
- A solar eclipse is kept when the Sun is above the horizon at maximum; a lunar
  eclipse when the Moon is up during its umbral phase.
- Meteor shower peaks are computed from the solar longitude published by the
  International Meteor Organization; they may differ by a few hours from the
  detailed forecasts of the year.
- At high latitudes in summer there is no astronomical night: the window falls
  back to nautical, then civil twilight. Beyond the polar circle the night
  sensors show "—".
- Constellations are named in Latin (Gemini, Leo…), the international
  convention.

## Troubleshooting

- **"No coordinates"**: locate your house in Gladys or type latitude and
  longitude in the configuration, then save.
- **Shifted times**: set the timezone in Settings → System, then click
  "Recompute now".
- **Aurora "Unavailable"**: NOAA does not answer; the "Test the NOAA service"
  button shows the exact error. The last values are served from the cache for
  six hours, the device is then flagged as degraded.
