import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import config from '../../vitest.config.mjs';
import { root } from './helpers';

// Expected thresholds are written by hand, not read from the configuration.
const strict = {
  statements: 100,
  branches: 100,
  functions: 100,
  lines: 100,
  perFile: true,
};
const application = { ...strict, branches: 95 };
const measuredLayers = [
  'src/application/**/*.ts',
  'src/domain/**/*.ts',
  'src/shared/**/*.ts',
];

const coverage = config.test?.coverage;
const thresholds: Record<string, unknown> = { ...coverage?.thresholds };
const include = coverage?.include ?? [];

// Leading path segments of a glob, up to the first wildcard.
const staticPrefix = (pattern: string): string => {
  const segments = pattern.split('/');
  const firstWildcard = segments.findIndex((s) => /[*?{[]/.test(s));
  return segments
    .slice(0, firstWildcard < 0 ? undefined : firstWildcard)
    .join('/');
};

const isExistingFolder = (pattern: string): boolean => {
  const prefix = staticPrefix(pattern);
  const path = resolve(root, prefix);
  return prefix !== '' && existsSync(path) && statSync(path).isDirectory();
};

describe('coverage configuration', () => {
  it('measures only shared, domain and application', () => {
    expect([...include].sort()).toEqual(measuredLayers);
  });

  it('requires 100% on every metric, per file, for shared and domain', () => {
    expect(thresholds['src/shared/**/*.ts']).toEqual(strict);
    expect(thresholds['src/domain/**/*.ts']).toEqual(strict);
  });

  it('requires 100% except 95% on branches, per file, for application', () => {
    expect(thresholds['src/application/**/*.ts']).toEqual(application);
  });

  it('sets no threshold outside the three layers', () => {
    expect(Object.keys(thresholds).sort()).toEqual(measuredLayers);
  });

  it('points every include and threshold pattern at an existing folder', () => {
    const patterns = [...include, ...Object.keys(thresholds)];
    expect(patterns.length).toBeGreaterThan(0);
    for (const pattern of patterns) {
      expect(isExistingFolder(pattern), pattern).toBe(true);
    }
  });
});
