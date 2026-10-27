import { describe, expect, it } from 'vitest';

import { isStale } from './isStale';

const MINUTE_MS = 60 * 1000;
const NOW = new Date(1_700_000_000_000);

describe('isStale', () => {
  it('keeps data observed exactly at the threshold as fresh', () => {
    const observedAt = new Date(NOW.getTime() - 15 * MINUTE_MS);

    expect(isStale(observedAt, NOW, 5 * MINUTE_MS)).toBe(false);
  });

  it('marks data one millisecond past the threshold as stale', () => {
    const observedAt = new Date(NOW.getTime() - 15 * MINUTE_MS - 1);

    expect(isStale(observedAt, NOW, 5 * MINUTE_MS)).toBe(true);
  });

  it('marks a missing observation as stale', () => {
    expect(isStale(null, NOW, 5 * MINUTE_MS)).toBe(true);
  });

  it('marks an observation dated after now as stale', () => {
    const observedAt = new Date(NOW.getTime() + 1);

    expect(isStale(observedAt, NOW, 5 * MINUTE_MS)).toBe(true);
  });

  it('marks an invalid date as stale', () => {
    expect(isStale(new Date(NaN), NOW, 5 * MINUTE_MS)).toBe(true);
  });

  it('scales the threshold with the frequency and multiplier given', () => {
    const observedAt = new Date(NOW.getTime() - 2 * MINUTE_MS - 1);

    expect(isStale(observedAt, NOW, MINUTE_MS, 2)).toBe(true);
  });
});
