import type { ProbeErrorCode } from '@/domain/errors/ProbeErrorCode';

/**
 * What one probe observed: a response (final status code and latency) or a
 * failure with a closed code. Never both, never neither.
 */
export type ProbeOutcome =
  | {
      readonly kind: 'response';
      readonly statusCode: number;
      readonly latencyMs: number;
    }
  | { readonly kind: 'failure'; readonly code: ProbeErrorCode };
