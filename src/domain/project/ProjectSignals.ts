import type { DeploymentSignal } from './DeploymentSignal';
import type { HealthSignal } from './HealthSignal';
import type { VulnerabilitySignal } from './VulnerabilitySignal';

/** The three signals of a project; each is `null` when there is no record. */
export interface ProjectSignals {
  readonly health: HealthSignal | null;
  readonly deployment: DeploymentSignal | null;
  readonly vulnerabilities: VulnerabilitySignal | null;
}
