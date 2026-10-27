import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// tsconfig.json is JSON with comments in general; here it is plain JSON.
const tsconfig = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../tsconfig.json'), 'utf8'),
) as { compilerOptions: Record<string, unknown> };
const options = tsconfig.compilerOptions;

// Expected options are written by hand, not read from the configuration.
describe('strict TypeScript options', () => {
  it('enables the strict set and leaves exactOptionalPropertyTypes off', () => {
    const enabled = [
      'strict',
      'noUncheckedIndexedAccess',
      'noImplicitOverride',
      'noImplicitReturns',
      'noFallthroughCasesInSwitch',
    ];
    expect(enabled.filter((option) => options[option] !== true)).toEqual([]);
    expect(options['exactOptionalPropertyTypes'] ?? false).toBe(false);
  });
});
