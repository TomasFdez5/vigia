import type { HealthStatus } from '@/domain/health/HealthStatus';

/** Latest recorded health check of a project and when it was observed. */
export interface HealthSignal {
  readonly status: HealthStatus;
  readonly observedAt: Date;
}
