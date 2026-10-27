/** Health check counts already restricted to one window. */
export interface AvailabilityCounts {
  readonly up: number;
  readonly degraded: number;
  readonly down: number;
}
