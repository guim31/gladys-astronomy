# Astronomy for Gladys Assistant

This integration computes, for your home, what is happening in the sky: the
next eclipses, the planets visible tonight, meteor showers, the moonless
dark-sky window, the seasons and an aurora outlook. Everything is computed
**locally**, without any key or account: the only outgoing connection is the
NOAA space weather service for the aurora Kp index, and it can be turned off.

Six devices appear in Gladys, each with text sensors (readable on the
dashboard) and numeric sensors (usable in scenes, with thresholds and history).

## Requirements

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

- **Go out and watch**: when "Dark sky now" becomes 1 and "Shower in progress"
  is 1, send a message with the "Active shower" text.
- **Never miss the eclipse**: if "Solar eclipse in" drops below 1 day, send the
  "Next solar eclipse" text every morning.
- **Aurora alert**: when "Aurora alert" becomes 1, or "Kp max next 24 h" exceeds
  6, notify and switch the outdoor lights off.
- **Garden lighting**: switch the garden lights off during the moonless window
  when the best score of the night is above 8.
- **Seasons**: when "Next season in" reaches 0, announce the equinox.

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
