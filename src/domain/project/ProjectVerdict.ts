import type { VulnerabilitySyncStatus } from '@/domain/vulnerability/VulnerabilitySyncStatus';

type NonEmpty<T> = readonly [T, ...T[]];

/** Reasons that make a project down. */
export type DownReason =
  { readonly code: 'probe_down' } | { readonly code: 'critical_vulnerability' };

/** Reasons that make a project degraded. */
export type DegradedReason =
  | { readonly code: 'probe_degraded' }
  | { readonly code: 'deployment_failed' }
  | { readonly code: 'high_vulnerability' };

/** Reasons that leave a project without recent data. */
export type NoRecentDataReason =
  | { readonly code: 'health_missing' }
  | { readonly code: 'health_stale' }
  | { readonly code: 'deployment_missing' }
  | { readonly code: 'deployment_unknown' }
  | { readonly code: 'deployment_stale' }
  | { readonly code: 'vulnerability_sync_missing' }
  | {
      readonly code: 'vulnerability_sync_not_ok';
      readonly syncStatus: Exclude<VulnerabilitySyncStatus, 'ok'>;
    }
  | { readonly code: 'vulnerability_sync_stale' };

/** Overall judgement of a project; only operational has no reasons. */
export type ProjectVerdict =
  | { readonly kind: 'operational'; readonly reasons: readonly [] }
  | { readonly kind: 'down'; readonly reasons: NonEmpty<DownReason> }
  | { readonly kind: 'degraded'; readonly reasons: NonEmpty<DegradedReason> }
  | {
      readonly kind: 'no_recent_data';
      readonly reasons: NonEmpty<NoRecentDataReason>;
    };
