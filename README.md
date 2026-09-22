# Gladys Astronomy

[Gladys Assistant](https://gladysassistant.com) external integration that turns
the sky above your house into sensors: the next **eclipses**, the **planets**
up tonight and their conjunctions, the **meteor showers**, the moonless
**observing window** with a sky quality score, the **seasons** and Earth's
orbit, and an **aurora** outlook from the NOAA planetary Kp index.

Six devices (history, thresholds in scenes), four dashboard widgets and six scene
triggers plus two scene actions (Gladys 5.1). Everything but the aurora is computed
locally with
[astronomy-engine](https://github.com/cosinekitty/astronomy) (MIT, pure
JavaScript, no data download). No key, no account.

![Cover](cover.jpg)

## Install

In Gladys: **Integrations → search "Astronomie" → Install**. The integration
needs a located house (Settings → Houses) or a latitude/longitude typed in its
configuration. The user documentation lives in [docs/en.md](docs/en.md) /
[docs/fr.md](docs/fr.md) and is shown by Gladys during installation.

## How it computes

- `src/astro/*` — pure functions over `Date`s and an observer, no I/O and no
  formatting: `eclipses.js` (local solar eclipses, lunar eclipses with the Moon
  up, transits), `night.js` (twilights, moonless window, sky score),
  `planets.js` (planets up in a window, oppositions, elongations),
  `conjunctions.js` (coarse 6-hour scan of the separation of 15 pairs, refined
  by golden-section search), `meteors.js` (peaks from the IMO solar longitudes
  in `src/data/meteor-showers.json`, precession-corrected), `seasons.js`.
- `src/aurora/noaa.js` — the only network module. Parses the NOAA Kp forecast,
  which the engine caches in `/data` and serves for six hours when NOAA is down
  (the device is then flagged degraded through `publishTransports`).
- `src/engine.js` — runs the modules and keeps a snapshot; `src/devices/*`
  turn the snapshot into six Gladys devices; `src/formatters.js` is the only
  place that formats dates (with the `TZ` the Gladys supervisor injects).
- `src/scheduler.js` — four cadences inside the container: rare events daily
  at 03:00 local, the night every 30 min, countdowns every `refresh_minutes`,
  NOAA every 30 min. Devices are published with `should_poll: false`; an
  `onPoll` fallback still answers if a user enables Gladys polling.

- `src/widgets/*` — pure builders from the snapshot to the core's widget
  vocabulary, in the language of the viewing user; `src/agenda.js` merges every
  upcoming event for the agenda widget and the `next_event` action. The tests run
  every content through the SDK's `validateWidgetContent`.
- `src/scene-events.js` — `planEvents` (pure) lists the timed triggers with stable
  ids; the event scheduler arms timers for the next 24 h, publishes with
  `publishSceneEvent` and remembers what it sent in `/data/fired-events.json`
  (no replay after a restart, 15 min catch-up). `aurora_alert` fires on a rising
  alert level only. `src/scene-actions.js` answers the two scene actions.
- Widget, trigger and action keys are part of the users' dashboards and scenes:
  never rename or remove one after a release.

## Development

```bash
npm install
npm test            # node --test
npm run lint
npm run format:check
npx -y github:GladysAssistant/integration-store .   # store validator
```

Tests use fixed dates and the Paris observer; reference values (the 12 August
2026 eclipse, the September equinox, the Perseids peak...) come from
astronomy-engine itself with tolerances of a few minutes.

## Release

GitHub → Actions → **Release** → choose `patch`/`minor`/`major`. The workflow
bumps `package.json` and the manifest, tags, builds the multi-arch image to
`ghcr.io/guim31/gladys-astronomy` and the Gladys store indexes the new version
within the hour. The repository must carry the `gladys-assistant-integration`
topic.

## Legal

Apache-2.0. Meteor shower data from the International Meteor Organization
working list; aurora data from NOAA SWPC (public domain). Not affiliated with
either.
