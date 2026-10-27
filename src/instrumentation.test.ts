import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateEnvAtStartup = vi.fn<() => void>();
vi.mock('./composition/env', () => ({ validateEnvAtStartup }));

describe('register', () => {
  beforeEach(() => {
    validateEnvAtStartup.mockReset();
  });

  it('validates the environment when the server starts', async () => {
    const { register } = await import('./instrumentation');
    register();
    expect(validateEnvAtStartup).toHaveBeenCalledTimes(1);
  });
});
