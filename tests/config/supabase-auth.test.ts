import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'smol-toml';
import { beforeAll, describe, expect, it } from 'vitest';

interface Requirement {
  title: string;
  path: readonly string[];
  expected: unknown;
}

function isTable(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// A missing table or key yields undefined, so it fails the assertion instead
// of throwing.
function valueAt(root: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>(
    (node, key) => (isTable(node) ? node[key] : undefined),
    root,
  );
}

// Expected values come from the auth requirements, not from the configuration.
// Leaked-password protection is not asserted: config push cannot set it and
// the free plan does not offer it.
const requirements: readonly Requirement[] = [
  {
    title: 'disables sign-up',
    path: ['auth', 'enable_signup'],
    expected: false,
  },
  {
    title: 'disables email sign-up',
    path: ['auth', 'email', 'enable_signup'],
    expected: false,
  },
  {
    title: 'disables anonymous sign-ins',
    path: ['auth', 'enable_anonymous_sign_ins'],
    expected: false,
  },
  {
    title: 'requires passwords of at least 12 characters',
    path: ['auth', 'minimum_password_length'],
    expected: 12,
  },
  {
    title: 'requires letters and digits in passwords',
    path: ['auth', 'password_requirements'],
    expected: 'letters_digits',
  },
  {
    title: 'fixes the token lifetime at 3600 seconds',
    path: ['auth', 'jwt_expiry'],
    expected: 3600,
  },
];

describe('Supabase auth configuration', () => {
  let config: unknown;

  beforeAll(() => {
    config = parse(
      readFileSync(
        resolve(import.meta.dirname, '../../supabase/config.toml'),
        'utf8',
      ),
    );
  });

  it('applies every auth requirement', () => {
    const wrong = requirements
      .filter(({ path, expected }) => valueAt(config, path) !== expected)
      .map(({ title }) => title);
    expect(wrong).toEqual([]);
  });
});
