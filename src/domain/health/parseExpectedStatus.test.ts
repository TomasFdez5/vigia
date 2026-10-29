import { describe, expect, it } from 'vitest';

import { err, ok } from '@/shared/Result';

import { parseExpectedStatus } from './parseExpectedStatus';

describe('parseExpectedStatus', () => {
  it('parses a range and a single code in a list', () => {
    expect(parseExpectedStatus('200-399,401')).toEqual(
      ok([
        { from: 200, to: 399 },
        { from: 401, to: 401 },
      ]),
    );
  });

  it('tolerates whitespace around separators', () => {
    expect(parseExpectedStatus(' 200 - 399 , 401 ')).toEqual(
      ok([
        { from: 200, to: 399 },
        { from: 401, to: 401 },
      ]),
    );
  });

  it('accepts the 100 and 599 bounds', () => {
    expect(parseExpectedStatus('100-599')).toEqual(
      ok([{ from: 100, to: 599 }]),
    );
  });

  it.each([
    ['an inverted range', '399-200'],
    ['a code below 100', '99'],
    ['a code above 599', '600'],
    ['a non-numeric token', '2xx'],
    ['an empty segment', '200,,401'],
    ['an empty list', '   '],
  ])('fails closed on %s', (_name, definition) => {
    expect(parseExpectedStatus(definition)).toEqual(
      err('invalid_expected_status'),
    );
  });
});
