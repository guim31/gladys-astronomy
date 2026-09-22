// -----------------------------------------------------------------------------
// Dashboard widgets (Gladys 5.1): pure builders from the engine snapshot to
// the core's declarative content vocabulary. No computation happens here.
// -----------------------------------------------------------------------------

import * as tonight from './tonight.js';
import * as agenda from './agenda.js';
import * as aurora from './aurora.js';
import * as eclipse from './eclipse.js';

export const WIDGETS = {
  [tonight.KEY]: tonight.build,
  [agenda.KEY]: agenda.build,
  [aurora.KEY]: aurora.build,
  [eclipse.KEY]: eclipse.build,
};

/** Widgets to nudge after each scheduler scope. */
export const REFRESH_AFTER = {
  rare: [agenda.KEY, eclipse.KEY],
  night: [tonight.KEY, agenda.KEY],
  aurora: [aurora.KEY],
};
