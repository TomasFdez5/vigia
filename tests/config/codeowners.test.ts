import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { root } from './helpers';

const codeownersPath = resolve(root, '.github/CODEOWNERS');

const placeholderOwner = '@REPLACE-WITH-OWNER-HANDLE';

// Paths whose changes can weaken a security barrier: the composition layer
// (the only reader of the environment), the infrastructure layer (adapters
// holding provider credentials), the automation folder, the package manager
// policy file (install-script allow-list), the lint rules that enforce layers
// and security, the auth settings (sign-up off), the git hooks and scripts
// that run the checks, the dependency manifest and lockfile, and the secret
// scan and commit rule configurations.
const sensitivePaths = [
  '/src/composition/',
  '/src/infrastructure/',
  '/.github/',
  '/pnpm-workspace.yaml',
  '/eslint.config.mjs',
  '/supabase/',
  '/.husky/',
  '/scripts/',
  '/package.json',
  '/pnpm-lock.yaml',
  '/.secretlintrc.json',
  '/commitlint.config.mjs',
];

interface Rule {
  pattern: string;
  owners: string[];
}

function parseRules(): Rule[] {
  return readFileSync(codeownersPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
      const [pattern = '', ...owners] = line.split(/\s+/);
      return { pattern, owners };
    });
}

describe('ownership file', () => {
  it('exists in the automation folder', () => {
    expect(existsSync(codeownersPath)).toBe(true);
  });

  it('covers every sensitive path, and each one exists', () => {
    const patterns = parseRules().map((rule) => rule.pattern);
    expect(sensitivePaths.filter((path) => !patterns.includes(path))).toEqual(
      [],
    );
    expect(
      sensitivePaths.filter(
        (path) => !existsSync(resolve(root, path.slice(1))),
      ),
    ).toEqual([]);
  });

  it('assigns every rule to the placeholder owner only', () => {
    for (const rule of parseRules()) {
      expect(rule.owners).toEqual([placeholderOwner]);
    }
  });
});
