import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { lintCommitMessage, root } from './helpers';

const configPath = resolve(root, '.github/dependabot.yml');

interface Update {
  'package-ecosystem'?: string;
  directory?: string;
  'commit-message'?: { prefix?: string };
  cooldown?: { 'default-days'?: number };
}

interface DependabotConfig {
  version?: number;
  updates?: Update[];
}

const load = (): DependabotConfig =>
  parse(readFileSync(configPath, 'utf8')) as DependabotConfig;

const updateFor = (ecosystem: string): Update | undefined =>
  load().updates?.find((update) => update['package-ecosystem'] === ecosystem);

// Packages use `chore(deps)` and actions use `ci(deps)`, so update commits
// stay valid conventional commits.
const ecosystemPolicies = [
  { ecosystem: 'npm', prefix: 'chore(deps)' },
  { ecosystem: 'github-actions', prefix: 'ci(deps)' },
];

describe('dependency update config', () => {
  it.each(ecosystemPolicies)(
    'produces commit messages for $ecosystem that pass the commit rules',
    ({ ecosystem }) => {
      const prefix = updateFor(ecosystem)?.['commit-message']?.prefix ?? '';
      // Dependabot appends the colon and a space to an explicit prefix. The
      // title is a typical short one: longer real titles may exceed the
      // header limit, which the checklist tracks as unverified.
      const result = lintCommitMessage(
        `${prefix}: bump @types/node from 24.19.1 to 24.19.2\n`,
      );
      expect(result.status).toBe(0);
    },
  );

  it.each(ecosystemPolicies)(
    'delays new releases for $ecosystem by at least one day',
    ({ ecosystem }) => {
      expect(
        updateFor(ecosystem)?.cooldown?.['default-days'],
      ).toBeGreaterThanOrEqual(1);
    },
  );
});
