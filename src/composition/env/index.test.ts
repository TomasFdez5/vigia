import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real marker throws outside Next's react-server condition.
vi.mock('server-only', () => ({}));

const cronSecret = 'c'.repeat(32);

const stubValidEnv = (): void => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fake');
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_fake');
  vi.stubEnv('CRON_SECRET', cronSecret);
};

// A fresh module per test, so the memoized value never leaks between tests.
const load = async (): Promise<typeof import('./index')> => {
  vi.resetModules();
  return import('./index');
};

describe('getEnv', () => {
  beforeEach(() => {
    stubValidEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads and validates the process environment', async () => {
    const { getEnv } = await load();
    expect(getEnv().cronSecret).toBe(cronSecret);
  });

  it('memoizes: later environment changes are not seen', async () => {
    const { getEnv } = await load();
    const first = getEnv();
    vi.stubEnv('CRON_SECRET', 'd'.repeat(40));
    expect(getEnv()).toBe(first);
  });

  it('throws without a required variable and does not cache the failure', async () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    const { getEnv } = await load();
    expect(() => getEnv()).toThrow('SUPABASE_SECRET_KEY');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_fake');
    expect(getEnv().supabaseSecretKey).toBe('sb_secret_fake');
  });
});

describe('validateEnvAtStartup', () => {
  const exit = vi.spyOn(process, 'exit');
  const logError = vi.spyOn(console, 'error');

  beforeEach(() => {
    exit.mockImplementation(() => undefined as never);
    logError.mockImplementation(() => undefined);
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('NEXT_PHASE', 'phase-production-server');
    vi.stubEnv('CRON_SECRET', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    exit.mockReset();
    logError.mockReset();
  });

  const startupCheck = async (): Promise<void> => {
    const { validateEnvAtStartup } = await load();
    validateEnvAtStartup();
  };

  it('logs the error and exits with code 1 when a variable is missing', async () => {
    await startupCheck();
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('CRON_SECRET'),
    );
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('does not log any value when it exits', async () => {
    vi.stubEnv('CRON_SECRET', 'tooshort_value_that_must_not_leak');
    await startupCheck();
    expect(JSON.stringify(logError.mock.calls)).not.toContain(
      'tooshort_value_that_must_not_leak',
    );
  });

  it('still validates when the runtime variable is unset (fail closed)', async () => {
    vi.stubEnv('NEXT_RUNTIME', undefined);
    await expect(startupCheck()).rejects.toThrow('CRON_SECRET');
  });

  it('passes with a valid environment', async () => {
    stubValidEnv();
    await startupCheck();
    expect(exit).not.toHaveBeenCalled();
  });

  it('is skipped during the production build, which has no secrets', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    await startupCheck();
    expect(exit).not.toHaveBeenCalled();
  });

  it('is skipped in the edge runtime', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    await startupCheck();
    expect(exit).not.toHaveBeenCalled();
  });
});
