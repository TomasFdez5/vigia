import { describe, expect, it } from 'vitest';

import { err, isErr, isOk, ok } from './Result';

describe('Result', () => {
  it.each([
    ['zero', 0],
    ['empty string', ''],
    ['null', null],
  ])('reads a successful %s as success, never as an error', (_name, value) => {
    const result = ok(value);

    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
    expect(result.value).toBe(value);
  });

  it.each([['timeout'], ['']])(
    'reads a failure (%j) as an error, never as data',
    (error) => {
      const result = err(error);

      expect(isErr(result)).toBe(true);
      expect(isOk(result)).toBe(false);
      expect(result.error).toBe(error);
    },
  );
});
