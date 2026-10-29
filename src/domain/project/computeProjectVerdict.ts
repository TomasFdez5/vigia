import {
  DEFAULT_DEPLOYMENT_SYNC_FREQUENCY_MS,
  DEFAULT_HEALTH_CHECK_FREQUENCY_MS,
  DEFAULT_STALENESS_MULTIPLIER,
  DEFAULT_VULNERABILITY_SYNC_FREQUENCY_MS,
  isStale,
} from '@/domain/freshness/isStale';
import { compareSeverity } from '@/domain/vulnerability/compareSeverity';
import type { Severity } from '@/domain/vulnerability/Severity';

import type {
  DegradedReason,
  DownReason,
  NoRecentDataReason,
  ProjectVerdict,
} from './ProjectVerdict';
import type { ProjectSignals } from './ProjectSignals';

/** Expected job frequencies and the staleness multiplier used by the verdict. */
export interface VerdictThresholds {
  readonly healthCheckFrequencyMs: number;
  readonly deploymentSyncFrequencyMs: number;
  readonly vulnerabilitySyncFrequencyMs: number;
  readonly stalenessMultiplier: number;
}

const DEFAULT_VERDICT_THRESHOLDS: VerdictThresholds = {
  healthCheckFrequencyMs: DEFAULT_HEALTH_CHECK_FREQUENCY_MS,
  deploymentSyncFrequencyMs: DEFAULT_DEPLOYMENT_SYNC_FREQUENCY_MS,
  vulnerabilitySyncFrequencyMs: DEFAULT_VULNERABILITY_SYNC_FREQUENCY_MS,
  stalenessMultiplier: DEFAULT_STALENESS_MULTIPLIER,
};

/** Whether each signal is stale; a missing signal counts as stale. */
interface SignalFreshness {
  readonly healthStale: boolean;
  readonly deploymentStale: boolean;
  readonly vulnerabilitiesStale: boolean;
}

interface RuleInput {
  readonly signals: ProjectSignals;
  readonly freshness: SignalFreshness;
}

type Rule<R> = (input: RuleInput) => R | null;

/** Computes the staleness of each signal once, each with its own frequency. */
const computeFreshness = (
  signals: ProjectSignals,
  now: Date,
  thresholds: VerdictThresholds,
): SignalFreshness => {
  const stale = (observedAt: Date | null, frequencyMs: number): boolean =>
    isStale(observedAt, now, frequencyMs, thresholds.stalenessMultiplier);

  return {
    healthStale: stale(
      signals.health?.observedAt ?? null,
      thresholds.healthCheckFrequencyMs,
    ),
    deploymentStale: stale(
      signals.deployment?.observedAt ?? null,
      thresholds.deploymentSyncFrequencyMs,
    ),
    vulnerabilitiesStale: stale(
      signals.vulnerabilities?.observedAt ?? null,
      thresholds.vulnerabilitySyncFrequencyMs,
    ),
  };
};

/** Tells whether an open alert of exactly the given severity exists. */
const hasOpenAlert = (input: RuleInput, severity: Severity): boolean =>
  input.signals.vulnerabilities !== null &&
  input.signals.vulnerabilities.openSeverities.some(
    (open) => compareSeverity(open, severity) === 0,
  );

const DOWN_RULES: readonly Rule<DownReason>[] = [
  ({ signals }) =>
    signals.health !== null && signals.health.status === 'down'
      ? { code: 'probe_down' }
      : null,
  (input) =>
    hasOpenAlert(input, 'critical') ? { code: 'critical_vulnerability' } : null,
];

const DEGRADED_RULES: readonly Rule<DegradedReason>[] = [
  ({ signals }) =>
    signals.health !== null && signals.health.status === 'degraded'
      ? { code: 'probe_degraded' }
      : null,
  ({ signals }) =>
    signals.deployment !== null && signals.deployment.status === 'failed'
      ? { code: 'deployment_failed' }
      : null,
  (input) =>
    hasOpenAlert(input, 'high') ? { code: 'high_vulnerability' } : null,
];

const NO_RECENT_DATA_RULES: readonly Rule<NoRecentDataReason>[] = [
  ({ signals, freshness }) => {
    if (signals.health === null) {
      return { code: 'health_missing' };
    }
    return freshness.healthStale ? { code: 'health_stale' } : null;
  },
  ({ signals, freshness }) => {
    if (signals.deployment === null) {
      return { code: 'deployment_missing' };
    }
    if (signals.deployment.status === 'unknown') {
      return { code: 'deployment_unknown' };
    }
    return freshness.deploymentStale ? { code: 'deployment_stale' } : null;
  },
  ({ signals, freshness }) => {
    const sync = signals.vulnerabilities;
    if (sync === null) {
      return { code: 'vulnerability_sync_missing' };
    }
    switch (sync.syncStatus) {
      case 'not_enabled':
      case 'no_access':
      case 'error':
        return {
          code: 'vulnerability_sync_not_ok',
          syncStatus: sync.syncStatus,
        };
      case 'ok':
        return freshness.vulnerabilitiesStale
          ? { code: 'vulnerability_sync_stale' }
          : null;
    }
  },
];

/** Runs every rule of one level and keeps the reasons that apply, in order. */
const collect = <R>(
  rules: readonly Rule<R>[],
  input: RuleInput,
): readonly R[] =>
  rules.flatMap((rule) => {
    const reason = rule(input);
    return reason === null ? [] : [reason];
  });

/**
 * Computes the verdict of a project from its three signals. Levels are
 * evaluated in order down, degraded, no_recent_data; the first level with
 * reasons wins and lists only its own reasons. A bad status counts as known
 * bad even when stale, and open alerts count whatever the sync state or age.
 * Operational only when no rule applies.
 */
export const computeProjectVerdict = (
  signals: ProjectSignals,
  now: Date,
  thresholds: VerdictThresholds = DEFAULT_VERDICT_THRESHOLDS,
): ProjectVerdict => {
  const input: RuleInput = {
    signals,
    freshness: computeFreshness(signals, now, thresholds),
  };

  const [down, ...moreDown] = collect(DOWN_RULES, input);
  if (down !== undefined) {
    return { kind: 'down', reasons: [down, ...moreDown] };
  }
  const [degraded, ...moreDegraded] = collect(DEGRADED_RULES, input);
  if (degraded !== undefined) {
    return { kind: 'degraded', reasons: [degraded, ...moreDegraded] };
  }
  const [noData, ...moreNoData] = collect(NO_RECENT_DATA_RULES, input);
  if (noData !== undefined) {
    return { kind: 'no_recent_data', reasons: [noData, ...moreNoData] };
  }
  return { kind: 'operational', reasons: [] };
};
