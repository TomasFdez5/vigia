import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseEnv } from '../../src/composition/env/parse';
import { root } from './helpers';

const read = (path: string): string =>
  readFileSync(resolve(root, path), 'utf8');

const isIgnored = (path: string): boolean =>
  spawnSync('git', ['check-ignore', '--quiet', path], { cwd: root }).status ===
  0;

describe('server-only marker', () => {
  it('is imported by the env accessor', () => {
    expect(read('src/composition/env/index.ts')).toMatch(
      /^import 'server-only';$/m,
    );
  });
});

describe('ignore rules', () => {
  it.each([
    '.env',
    '.env.local',
    '.env.production',
    '.env.development.local',
    '.env.test',
    '.env.staging',
  ])('ignores %s', (path) => {
    expect(isIgnored(path)).toBe(true);
  });

  it('does not ignore the example file', () => {
    expect(isIgnored('.env.example')).toBe(false);
  });
});

describe('.env.example', () => {
  const entries = Object.fromEntries(
    read('.env.example')
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)] as const;
      }),
  );

  it('holds only evidently invalid placeholders', () => {
    for (const value of Object.values(entries)) {
      expect(value).toMatch(/^(replace-me|https:\/\/replace-me\.invalid)?$/);
    }
  });

  it('fails closed when copied unchanged', () => {
    expect(() => parseEnv(entries)).toThrow('CRON_SECRET');
  });
});
