# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/). The notes of the versions up to
1.1.0 are in the [GitHub Releases](https://github.com/guim31/gladys-astronomy/releases).

## [Unreleased]

### Changed

- Quieter logs: at the default level they show the start, the schedule and the
  problems once each (a NOAA outage logs one line when it starts and one when it
  is over, instead of one every 30 minutes). Every cycle, every published state
  and every scene trigger sent is now a debug line (`LOG_LEVEL=debug`).
- Built on version 0.15 of the Gladys integration SDK; dependencies updated.

### Fixed

- A poll requested by Gladys before the integration knows the house location
  no longer answers with an error. The devices are still refreshed by the
  integration itself (`should_poll: false`), so they are not affected by the
  Gladys 5.2.0 polling issue.
