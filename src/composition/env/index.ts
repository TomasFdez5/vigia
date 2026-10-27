import 'server-only';

import { type Env, parseEnv } from './parse';

let cached: Env | undefined;

/**
 * The only reader of the process environment (SPEC §3.2). Validates on first
 * call and memoizes; a failed validation is not cached.
 */
export const getEnv = (): Env => {
  cached ??= parseEnv(process.env);
  return cached;
};

/**
 * Fail-closed startup check, called from instrumentation. Skipped during
 * `next build` (NEXT_PHASE), which has no secrets, and in the edge runtime,
 * where the server-only configuration is never used. Any other runtime value,
 * or none, validates. On failure it logs the message (names and rules only)
 * and exits: Next would otherwise keep serving 500s from a live process.
 */
export const validateEnvAtStartup = (): void => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }
  // Next inlines NEXT_RUNTIME per bundle and drops the branch that cannot run,
  // so process.exit (unsupported in edge) stays out of the edge bundle. This
  // positive check is the form Next documents for that.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      getEnv();
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : 'Invalid environment',
      );
      process.exit(1);
    }
  } else if (process.env.NEXT_RUNTIME !== 'edge') {
    // Unknown runtime: still fail closed, by throwing.
    getEnv();
  }
};
