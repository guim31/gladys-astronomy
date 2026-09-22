import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { WIDGETS, REFRESH_AFTER } from '../src/widgets/index.js';
import { computedSnapshot, noaaDown } from './helpers/snapshot.js';

process.env.TZ = 'Europe/Paris';

const DATES = ['2026-09-20T10:00:00Z', '2026-08-12T15:00:00Z', '2026-06-21T22:00:00Z'];

test('every widget passes the SDK validator untouched, in every language, on several dates', async () => {
  for (const iso of DATES) {
    const { snapshot, config, now } = await computedSnapshot(iso);
    for (const [key, build] of Object.entries(WIDGETS)) {
      for (const language of ['fr', 'en', 'de']) {
        const content = build(snapshot, { settings: {}, language, now, config });
        assert.deepEqual(validateWidgetContent(content), [], `${key} ${language} ${iso}`);
        assert.ok(content.components.length > 0);
      }
    }
  }
});

test('without a location every widget shows an explanatory text, still valid', () => {
  for (const [key, build] of Object.entries(WIDGETS)) {
    const content = build(undefined, {
      settings: {},
      language: 'fr',
      now: new Date(),
      config: { aurora_enabled: true },
    });
    assert.deepEqual(validateWidgetContent(content), [], key);
    assert.equal(content.components[0].type, 'text');
  }
});

test('tonight: gauge, five tiles, a score curve with dusk/dawn markers, the planets', async () => {
  const { snapshot, config, now } = await computedSnapshot('2026-09-20T10:00:00Z');
  const content = WIDGETS.astro_tonight(snapshot, { language: 'fr', now, config });
  const types = content.components.map((c) => c.type);
  assert.deepEqual(types, ['text', 'gauge', 'value', 'value', 'value', 'value', 'chart', 'status']);
  const chart = content.components.find((c) => c.type === 'chart');
  assert.ok(chart.series[0].points.length > 40);
  assert.deepEqual(
    chart.annotations.map((a) => a.label),
    ['Nuit noire', 'Sans Lune'],
  );
  assert.equal(chart.now_marker, true);
  const status = content.components.find((c) => c.type === 'status');
  assert.deepEqual(
    status.items.map((i) => i.label),
    ['Jupiter', 'Saturne', 'Mars'],
  );
  const en = WIDGETS.astro_tonight(snapshot, { language: 'en', now, config });
  assert.match(en.components[0].text, /^Night of /);
});

test('agenda: chronological cards, badges by urgency, category and period settings', async () => {
  const { snapshot, config, now } = await computedSnapshot('2026-09-20T10:00:00Z');
  const content = WIDGETS.astro_agenda(snapshot, { settings: {}, language: 'fr', now, config });
  const list = content.components.find((c) => c.type === 'card-list');
  assert.equal(list.items.length, 8);
  assert.equal(list.items[0].title, 'Équinoxe d’automne');
  // 20/09 at noon -> equinox on 23/09 at 02:05 local: three calendar days.
  assert.equal(list.items[0].badge.text, 'J-3');
  assert.equal(list.items[0].badge.color, 'warning');
  const dates = list.items.map((i) => Date.parse(i.date));
  assert.deepEqual(
    dates,
    [...dates].sort((a, b) => a - b),
  );

  const meteors = WIDGETS.astro_agenda(snapshot, {
    settings: { categories: ['meteors'], horizon_days: '365' },
    language: 'fr',
    now,
    config,
  });
  const items = meteors.components.find((c) => c.type === 'card-list').items;
  assert.ok(items.length >= 3);
  assert.ok(items.every((i) => i.title.startsWith('Pic des')));
  assert.equal(items[0].title, 'Pic des Draconides');

  const eclipses30 = WIDGETS.astro_agenda(snapshot, {
    settings: { categories: 'eclipses', horizon_days: '30' },
    language: 'en',
    now,
    config,
  });
  assert.equal(eclipses30.components[0].type, 'text', 'no eclipse within 30 days: empty state');
  assert.equal(eclipses30.components[0].variant, 'body');
});

test('eclipse: next one by default, solar or lunar on demand', async () => {
  const { snapshot, config, now } = await computedSnapshot('2026-08-01T10:00:00Z');
  const any = WIDGETS.astro_eclipse(snapshot, { settings: {}, language: 'fr', now, config });
  assert.equal(any.components[0].text, 'Éclipse partielle de Soleil');
  assert.equal(any.components[1].value, 11);
  const gauge = any.components.find((c) => c.type === 'gauge');
  assert.ok(gauge.value > 85 && gauge.value < 99);
  const lunar = WIDGETS.astro_eclipse(snapshot, {
    settings: { kind: 'lunar' },
    language: 'en',
    now,
    config,
  });
  assert.equal(lunar.components[0].text, 'Partial lunar eclipse');
  const labels = lunar.components.find((c) => c.type === 'status').items.map((i) => i.label);
  assert.ok(labels.includes('Visible'));
});

test('aurora: tiles colored by Kp, a bar chart, the alert annotation; disabled and down states', async () => {
  const { snapshot, config, now } = await computedSnapshot('2026-09-20T10:00:00Z');
  const content = WIDGETS.astro_aurora(snapshot, { language: 'fr', now, config });
  const tiles = content.components.filter((c) => c.type === 'value');
  assert.deepEqual(
    tiles.map((t) => [t.value, t.color]),
    [
      [4.67, 'info'],
      [5.67, 'warning'],
      [7.33, 'danger'],
    ],
  );
  const chart = content.components.find((c) => c.type === 'chart');
  assert.equal(chart.chart_type, 'bar');
  assert.equal(chart.annotations[0].value, 5.33);

  const off = WIDGETS.astro_aurora(snapshot, {
    language: 'fr',
    now,
    config: { ...config, aurora_enabled: false },
  });
  assert.match(off.components[0].text, /désactivée/);

  const down = await computedSnapshot('2026-09-20T10:00:00Z', {}, { fetchImpl: noaaDown });
  const unavailable = WIDGETS.astro_aurora(down.snapshot, {
    language: 'en',
    now: down.now,
    config: down.config,
  });
  assert.match(unavailable.components[0].text, /NOAA does not answer/);
});

test('badges count calendar days: an event at 02:05 tomorrow is "Demain", not "Aujourd’hui"', async () => {
  const { snapshot, config } = await computedSnapshot('2026-09-22T20:30:00Z');
  const now = new Date('2026-09-22T20:30:00Z'); // 22:30 in Paris, equinox at 02:05
  const content = WIDGETS.astro_agenda(snapshot, { settings: {}, language: 'fr', now, config });
  const first = content.components.find((c) => c.type === 'card-list').items[0];
  assert.equal(first.title, 'Équinoxe d’automne');
  assert.deepEqual(first.badge, { text: 'Demain', color: 'danger' });
});

test('refresh map only names declared widgets', () => {
  for (const keys of Object.values(REFRESH_AFTER)) {
    for (const key of keys) {
      assert.ok(key in WIDGETS);
    }
  }
});
