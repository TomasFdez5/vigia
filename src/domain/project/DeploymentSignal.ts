import type { DeploymentStatus } from '@/domain/deployment/DeploymentStatus';

/** Latest recorded deployment state of a project and when it was observed. */
export interface DeploymentSignal {
  readonly status: DeploymentStatus;
  readonly observedAt: Date;
}
