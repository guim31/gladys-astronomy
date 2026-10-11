// -----------------------------------------------------------------------------
// Translation guard: every text shown to the user exists in the four languages
// of the Gladys UI (en, fr, de, es), is not empty, fits its slot, and the
// German texts use "du" (never the polite "Sie"/"Ihr").
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGUAGES } from '../src/config.js';
import { T } from '../src/formatters.js';
import { STRINGS } from '../src/widgets/i18n.js';
import { ACTIONS, TEXTS } from '../src/actions.js';
import { MESSAGES } from '../src/scheduler.js';
import { NAMES as ECLIPSES } from '../src/devices/eclipses.js';
import { NAMES as METEORS } from '../src/devices/meteors.js';
import { NAMES as NIGHT } from '../src/devices/night.js';
import { NAMES as PLANETS } from '../src/devices/planets.js';
import { NAMES as SEASONS } from '../src/devices/seasons.js';
import { NAMES as AURORA, aurora } from '../src/devices/aurora.js';
import { createFakeGladys } from './helpers/fakeGladys.js';
import { computedSnapshot, noaaOk } from './helpers/snapshot.js';

const LANGS = ['de', 'en', 'es', 'fr'];
const POLITE = /\b(Sie|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres)\b/;
const ROOT = fileURLToPath(new URL('..', import.meta.url));

const manifest = JSON.parse(
  await readFile(path.join(ROOT, 'gladys-assistant-integration.json'), 'utf8'),
);
const showers = JSON.parse(await readFile(path.join(ROOT, 'src/data/meteor-showers.json'), 'utf8'));

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const sorted = (o) => Object.keys(o).sort();

/** A non-empty text, bounded, and in "du" form when German. */
function checkText(text, lang, where, max) {
  assert.equal(typeof text, 'string', `${where}: not a string`);
  assert.ok(text.trim().length > 0, `${where}: empty`);
  assert.ok(text.length <= max, `${where}: ${text.length} chars > ${max}`);
  if (lang === 'de') {
    assert.doesNotMatch(text, POLITE, `${where}: polite German form`);
  }
}

/** Collect every object keyed by at least one language code. */
function multilingual(node, where, out = []) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => multilingual(v, `${where}[${i}]`, out));
  } else if (isObject(node)) {
    if (Object.keys(node).some((k) => LANGS.includes(k))) {
      out.push({ where, value: node });
    } else {
      for (const [k, v] of Object.entries(node)) {
        multilingual(v, `${where}.${k}`, out);
      }
    }
  }
  return out;
}

function manifestLimit(where) {
  if (where === '$.description') {
    return 100; // store limit
  }
  if (where.endsWith('.label')) {
    return 60;
  }
  if (where.endsWith('.placeholder')) {
    return 30;
  }
  return 600;
}

test('the guard knows the languages of the code', () => {
  assert.deepEqual([...LANGUAGES].sort(), LANGS);
});

test('every multilingual object of the manifest has exactly en, fr, de and es', () => {
  const found = multilingual(manifest, '$');
  // The manifest holds 179 of them: a walker that silently skips would pass.
  assert.ok(found.length >= 170, `only ${found.length} multilingual objects found`);
  for (const { where, value } of found) {
    assert.deepEqual(sorted(value), LANGS, `${where}: languages`);
    for (const lang of LANGS) {
      checkText(value[lang], lang, `${where}.${lang}`, manifestLimit(where));
    }
  }
});

test('every language select of the manifest offers the four languages', () => {
  const selects = [
    ...manifest.config_schema,
    ...manifest.scene_actions.flatMap((a) => a.fields ?? []),
  ].filter((f) => f.key === 'language');
  assert.equal(selects.length, 3);
  for (const field of selects) {
    assert.deepEqual(field.options.map((o) => o.value).sort(), LANGS);
  }
});

/**
 * A table keyed by language: same shape as the English one in every
 * language, every leaf a non-empty bounded text (functions are checked on
 * their source for the polite German form, and called by dedicated tests).
 */
function checkTable(name, table, max) {
  assert.deepEqual(sorted(table), LANGS, `${name}: languages`);
  const walk = (ref, value, lang, where) => {
    if (typeof ref === 'function') {
      assert.equal(typeof value, 'function', `${where}: not a function`);
      if (lang === 'de') {
        assert.doesNotMatch(value.toString(), POLITE, `${where}: polite German form`);
      }
    } else if (typeof ref === 'string') {
      checkText(value, lang, where, max);
    } else {
      assert.ok(isObject(ref) || Array.isArray(ref), `${where}: unexpected type`);
      assert.deepEqual(sorted(value), sorted(ref), `${where}: keys differ from en`);
      for (const k of Object.keys(ref)) {
        walk(ref[k], value[k], lang, `${where}.${k}`);
      }
    }
  };
  for (const lang of LANGS) {
    walk(table.en, table[lang], lang, `${name}.${lang}`);
  }
}

test('message tables of the code have the four languages and the same shape', () => {
  checkTable('formatters.T', T, 120);
  checkTable('widgets.STRINGS', STRINGS, 120);
  checkTable('actions.TEXTS', TEXTS, 120);
  // Feature names: kept short for the device page and the dashboard.
  for (const [name, table] of Object.entries({
    ECLIPSES,
    METEORS,
    NIGHT,
    PLANETS,
    SEASONS,
    AURORA,
  })) {
    checkTable(`devices.${name}`, table, 40);
  }
  for (const [key, message] of Object.entries(MESSAGES)) {
    assert.deepEqual(sorted(message), LANGS, `MESSAGES.${key}`);
    for (const lang of LANGS) {
      checkText(message[lang], lang, `MESSAGES.${key}.${lang}`, 300);
    }
  }
  for (const shower of showers) {
    assert.deepEqual(sorted(shower.name), LANGS, `shower ${shower.code}`);
    for (const lang of LANGS) {
      checkText(shower.name[lang], lang, `shower ${shower.code}.${lang}`, 40);
    }
  }
});

test('widget texts fit the slots of the core (tile 24, status 40, badge 16, title 60)', () => {
  const TILES = [
    'skyNow',
    'moonlessFrom',
    'moonlessLength',
    'moon',
    'planets',
    'eclipseIn',
    'obscuration',
    'altitudeAtPeak',
    'kpNow',
    'kpMax24',
    'kpMax72',
  ];
  const STATUS = [
    'shower',
    'alertLevel',
    'nextAlert',
    'source',
    'date',
    'partialBegin',
    'totalBegin',
    'peak',
    'end',
    'visibleFromTo',
  ];
  for (const lang of LANGS) {
    const s = STRINGS[lang];
    for (const key of TILES) {
      checkText(s[key], lang, `STRINGS.${lang}.${key}`, 24);
    }
    for (const key of STATUS) {
      checkText(s[key], lang, `STRINGS.${lang}.${key}`, 40);
    }
    for (const level of s.levels) {
      checkText(level, lang, `STRINGS.${lang}.levels`, 40);
    }
    for (let days = 0; days <= 400; days += 1) {
      checkText(s.inDays(days), lang, `STRINGS.${lang}.inDays(${days})`, 16);
    }
    for (const kind of Object.values(T[lang].kind)) {
      checkText(s.solarEclipse(kind), lang, `STRINGS.${lang}.solarEclipse`, 60);
      checkText(s.lunarEclipse(kind), lang, `STRINGS.${lang}.lunarEclipse`, 60);
    }
    for (const shower of showers) {
      checkText(s.meteorPeak(shower.name[lang]), lang, `STRINGS.${lang}.meteorPeak`, 60);
    }
    checkText(s.agendaCaption(3, 90), lang, `STRINGS.${lang}.agendaCaption`, 120);
    checkText(s.nightOf('01/01/2026', '7'), lang, `STRINGS.${lang}.nightOf`, 120);
  }
});

test('messages built at run time carry the four languages', async () => {
  const { snapshot, config } = await computedSnapshot('2026-09-20T12:00:00Z');
  const recomputed = await ACTIONS.recompute_now({
    scheduler: { recompute: async () => {} },
    engine: { getSnapshot: () => snapshot },
    location: { latitude: 48.8566, longitude: 2.3522, source: 'house' },
  });
  const noaa = await ACTIONS.test_noaa({ config, fetchImpl: noaaOk });
  const noLocation = await ACTIONS.recompute_now({});
  const gladys = createFakeGladys();
  const cached = aurora.transport(gladys, { aurora: { source: 'cache' } }).message;
  const down = aurora.transport(gladys, { aurora: { source: 'none' } }).message;
  for (const [name, message] of Object.entries({ recomputed, noaa, noLocation, cached, down })) {
    assert.deepEqual(sorted(message), LANGS, name);
    for (const lang of LANGS) {
      checkText(message[lang], lang, `${name}.${lang}`, 600);
    }
  }
});

test('no inline message of the code forgets a language', async () => {
  const files = ['index.js'];
  for (const dir of ['src', 'src/devices', 'src/widgets', 'src/astro', 'src/aurora']) {
    for (const name of await readdir(path.join(ROOT, dir))) {
      if (name.endsWith('.js')) {
        files.push(`${dir}/${name}`);
      }
    }
  }
  for (const file of files) {
    const source = await readFile(path.join(ROOT, file), 'utf8');
    const count = (lang) => (source.match(new RegExp(`\\b${lang}:\\s`, 'g')) ?? []).length;
    const counts = Object.fromEntries(LANGS.map((lang) => [lang, count(lang)]));
    assert.ok(
      LANGS.every((lang) => counts[lang] === counts.en),
      `${file}: ${JSON.stringify(counts)}`,
    );
    assert.doesNotMatch(source, /language\s*===\s*'/, `${file}: text chosen by a language test`);
  }
});
