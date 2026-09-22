// A fully computed engine snapshot for Paris at a fixed instant.
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createEngine } from '../../src/engine.js';
import { normalizeConfig } from '../../src/config.js';
import { PARIS } from './paris.js';

export const NOAA_FIXTURE = JSON.parse(
  readFileSync(new URL('../fixtures/noaa-kp.json', import.meta.url), 'utf8'),
);

export const noaaOk = async () => ({ ok: true, status: 200, json: async () => NOAA_FIXTURE });
export const noaaDown = async () => {
  throw new Error('ENETUNREACH');
};

export async function computedSnapshot(iso, overrides = {}, { fetchImpl = noaaOk } = {}) {
  const config = normalizeConfig(overrides);
  const now = new Date(iso);
  const engine = createEngine({
    config,
    location: PARIS,
    dataDir: mkdtempSync(path.join(tmpdir(), 'gladys-astronomy-')),
    now: () => now,
    fetchImpl,
  });
  await engine.computeAll();
  return { snapshot: engine.getSnapshot(), config, now };
}
