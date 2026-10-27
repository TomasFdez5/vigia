/** Default number of expected job runs after which data is stale. */
export const DEFAULT_STALENESS_MULTIPLIER = 3;

/** Expected interval between health checks, in milliseconds. */
export const DEFAULT_HEALTH_CHECK_FREQUENCY_MS = 5 * 60 * 1000;

/** Expected interval between deployment syncs, in milliseconds. */
export const DEFAULT_DEPLOYMENT_SYNC_FREQUENCY_MS = 15 * 60 * 1000;

/** Expected interval between vulnerability syncs, in milliseconds. */
export const DEFAULT_VULNERABILITY_SYNC_FREQUENCY_MS = 24 * 60 * 60 * 1000;

/**
 * Tells whether an observation is stale. Missing, invalid or future-dated
 * observations are stale; otherwise it is stale when its age exceeds the
 * multiplier times the expected frequency. Exactly at the threshold is fresh.
 */
export const isStale = (
  observedAt: Date | null,
  now: Date,
  expectedFrequencyMs: number,
  multiplier: number = DEFAULT_STALENESS_MULTIPLIER,
): boolean => {
  if (observedAt === null) {
    return true;
  }
  if (Number.isNaN(observedAt.getTime())) {
    return true;
  }
  const ageMs = now.getTime() - observedAt.getTime();
  if (ageMs < 0) {
    return true;
  }
  return ageMs > multiplier * expectedFrequencyMs;
};
