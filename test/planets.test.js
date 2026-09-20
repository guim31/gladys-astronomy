import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planetsInWindow, upcomingPlanetEvents } from '../src/astro/planets.js';
import {
  upcomingConjunctions,
  scanPair,
  refineMinimum,
  separation,
  watchedPairs,
} from '../src/astro/conjunctions.js';
import { Body } from '../src/astro/observer.js';
import { paris, d, withinDays, minutesApart } from './helpers/paris.js';

const NIGHT_22_09 = { start: d('2026-09-22T18:20:00Z'), end: d('2026-09-23T05:06:00Z') };

test('planets up on the night of 22 September 2026 from Paris', () => {
  const list = planetsInWindow(NIGHT_22_09, paris);
  const bodies = list.map((p) => p.body);
  assert.ok(bodies.includes('saturn'), 'Saturn near opposition');
  assert.ok(bodies.includes('jupiter'));
  assert.ok(!bodies.includes('venus'), 'Venus too close to the Sun');
  assert.equal(list[0].body, 'jupiter', 'brightest first');
  const saturn = list.find((p) => p.body === 'saturn');
  assert.ok(saturn.maxAltitude > 35 && saturn.maxAltitude < 50);
  assert.ok(saturn.from < saturn.to);
  assert.ok(typeof saturn.constellation === 'string' && saturn.constellation.length > 0);
});

test('Saturn opposition on 4 October 2026, Venus greatest elongation in August 2026', () => {
  const events = upcomingPlanetEvents(d('2026-09-20T12:00:00Z'));
  assert.equal(events[0].kind, 'opposition');
  assert.equal(events[0].body, 'saturn');
  assert.ok(withinDays(events[0].time, '2026-10-04T12:00:00Z', 1));
  const venus = upcomingPlanetEvents(d('2026-06-01T00:00:00Z')).find((e) => e.body === 'venus');
  assert.equal(venus.kind, 'elongation');
  assert.equal(venus.visibility, 'evening');
  assert.ok(venus.elongation >= 45 && venus.elongation <= 48);
  assert.ok(withinDays(venus.time, '2026-08-15T00:00:00Z', 1));
});

test('15 watched pairs', () => {
  assert.equal(watchedPairs().length, 15);
});

test('the solar eclipse is the tightest Moon-Sun approach: the scanner finds it', () => {
  const found = scanPair(Body.Moon, Body.Sun, d('2026-08-01T00:00:00Z'), 30, { maxSeparation: 3 });
  assert.equal(found.length, 1);
  assert.ok(minutesApart(found[0].time, d('2026-08-12T17:46:00Z')) < 15);
  assert.ok(found[0].separation < 1);
});

test('refineMinimum never does worse than the samples around it', () => {
  const a = d('2026-08-12T06:00:00Z');
  const b = d('2026-08-13T06:00:00Z');
  const refined = refineMinimum(Body.Moon, Body.Sun, a, b);
  assert.ok(refined.separation <= separation(Body.Moon, Body.Sun, a));
  assert.ok(refined.separation <= separation(Body.Moon, Body.Sun, b));
});

test('Moon-Jupiter approaches recur every 26-29 days', () => {
  const found = scanPair(Body.Moon, Body.Jupiter, d('2026-09-20T00:00:00Z'), 90, {
    maxSeparation: 10,
  });
  assert.ok(found.length >= 3);
  for (let i = 1; i < found.length; i += 1) {
    const days = (found[i].time - found[i - 1].time) / 86400000;
    assert.ok(days > 26 && days < 30, `${days}`);
  }
});

test('upcomingConjunctions is chronological, bounded, and flags visibility', () => {
  const list = upcomingConjunctions(d('2026-09-20T12:00:00Z'), paris, {
    lookaheadDays: 60,
    maxSeparation: 3,
  });
  assert.ok(list.length >= 2);
  for (let i = 1; i < list.length; i += 1) {
    assert.ok(list[i].time >= list[i - 1].time);
  }
  for (const c of list) {
    assert.ok(c.separation <= 3);
    assert.ok(c.angleFromSun >= 15);
    assert.equal(typeof c.visible, 'boolean');
  }
  const moonJupiter = list.find((c) => c.bodies[0] === 'moon' && c.bodies[1] === 'jupiter');
  assert.ok(moonJupiter && withinDays(moonJupiter.time, '2026-10-06T10:00:00Z', 1));
});
