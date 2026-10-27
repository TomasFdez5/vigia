import type { Availability } from './Availability';
import type { AvailabilityCounts } from './AvailabilityCounts';

/** Minimum share of the expected checks a window needs to show a ratio. */
export const DEFAULT_MIN_DATA_SHARE = 0.5;

/**
 * Computes availability for a window from its check counts. Returns no data
 * when the window or frequency is not positive, or when the total is below the
 * minimum share of the expected checks; degraded counts as available.
 */
export const calculateAvailability = (
  counts: AvailabilityCounts,
  windowMs: number,
  frequencyMs: number,
  minDataShare: number = DEFAULT_MIN_DATA_SHARE,
): Availability => {
  if (windowMs <= 0 || frequencyMs <= 0) {
    return { kind: 'no_data' };
  }
  const total = counts.up + counts.degraded + counts.down;
  const expectedChecks = windowMs / frequencyMs;
  if (total === 0 || total < minDataShare * expectedChecks) {
    return { kind: 'no_data' };
  }
  return { kind: 'available', ratio: (counts.up + counts.degraded) / total };
};
