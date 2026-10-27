import { describe, expect, it } from 'vitest';

import { calculateAvailability } from './calculateAvailability';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const WINDOW_MS = DAY_MS;
const FREQUENCY_MS = 5 * MINUTE_MS;

// 24 h at one check every 5 min is 288 expected checks; half is 144.
describe('calculateAvailability', () => {
  it('shows data when the total is exactly half of the expected checks', () => {
    const counts = { up: 144, degraded: 0, down: 0 };

    expect(calculateAvailability(counts, WINDOW_MS, FREQUENCY_MS)).toEqual({
      kind: 'available',
      ratio: 1,
    });
  });

  it('shows no data when the total is one check below half', () => {
    const counts = { up: 143, degraded: 0, down: 0 };

    expect(calculateAvailability(counts, WINDOW_MS, FREQUENCY_MS)).toEqual({
      kind: 'no_data',
    });
  });

  it('compares against the unrounded minimum', () => {
    // 10 min / 4 min is 2.5 expected checks, so the minimum is 1.25.
    const counts = { up: 1, degraded: 0, down: 0 };

    expect(
      calculateAvailability(counts, 10 * MINUTE_MS, 4 * MINUTE_MS),
    ).toEqual({ kind: 'no_data' });
  });

  it('shows no data for a zero total even when the minimum share is 0', () => {
    const counts = { up: 0, degraded: 0, down: 0 };

    expect(calculateAvailability(counts, WINDOW_MS, FREQUENCY_MS, 0)).toEqual({
      kind: 'no_data',
    });
  });

  it('counts degraded as available and down as unavailable', () => {
    const counts = { up: 72, degraded: 36, down: 36 };

    expect(calculateAvailability(counts, WINDOW_MS, FREQUENCY_MS)).toEqual({
      kind: 'available',
      ratio: 0.75,
    });
  });

  it('gives a ratio of 0 when every check is down and data is enough', () => {
    const counts = { up: 0, degraded: 0, down: 144 };

    expect(calculateAvailability(counts, WINDOW_MS, FREQUENCY_MS)).toEqual({
      kind: 'available',
      ratio: 0,
    });
  });

  it('uses the real total when there are more checks than expected', () => {
    const counts = { up: 300, degraded: 0, down: 100 };

    expect(calculateAvailability(counts, WINDOW_MS, FREQUENCY_MS)).toEqual({
      kind: 'available',
      ratio: 0.75,
    });
  });

  it.each([
    { name: 'a zero window', windowMs: 0, frequencyMs: FREQUENCY_MS },
    { name: 'a negative window', windowMs: -1, frequencyMs: FREQUENCY_MS },
    { name: 'a zero frequency', windowMs: WINDOW_MS, frequencyMs: 0 },
    { name: 'a negative frequency', windowMs: WINDOW_MS, frequencyMs: -1 },
  ])('shows no data for $name', ({ windowMs, frequencyMs }) => {
    const counts = { up: 144, degraded: 0, down: 0 };

    expect(calculateAvailability(counts, windowMs, frequencyMs)).toEqual({
      kind: 'no_data',
    });
  });

  it('scales the expected checks with a 7-day window', () => {
    // 7 d at one check every 5 min is 2016 expected; the minimum is 1008.
    const counts = { up: 288, degraded: 0, down: 0 };

    expect(calculateAvailability(counts, 604_800_000, FREQUENCY_MS)).toEqual({
      kind: 'no_data',
    });
  });
});
