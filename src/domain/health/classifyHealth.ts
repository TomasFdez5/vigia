import type { ExpectedStatus } from './ExpectedStatus';
import type { HealthStatus } from './HealthStatus';
import type { ProbeOutcome } from './ProbeOutcome';

/** Latency above this many milliseconds makes a response degraded. */
export const DEFAULT_LATENCY_THRESHOLD_MS = 2000;

/**
 * Classifies one probe outcome. Failures and 5xx responses are down; a
 * response is up only when its status is expected and its latency is within
 * the threshold, otherwise degraded.
 */
export const classifyHealth = (
  outcome: ProbeOutcome,
  expected: ExpectedStatus,
  latencyThresholdMs: number = DEFAULT_LATENCY_THRESHOLD_MS,
): HealthStatus => {
  if (outcome.kind === 'failure') {
    return 'down';
  }
  if (outcome.statusCode >= 500) {
    return 'down';
  }
  const isExpected = expected.some(
    (range) =>
      outcome.statusCode >= range.from && outcome.statusCode <= range.to,
  );
  return isExpected && outcome.latencyMs <= latencyThresholdMs
    ? 'up'
    : 'degraded';
};
