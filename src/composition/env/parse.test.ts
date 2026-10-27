import { describe, expect, it } from 'vitest';

import { parseEnv } from './parse';

// Obviously fake values; the secret-looking ones are used to prove they never
// reach an error message.
const cronSecret = 'c'.repeat(32);
const valid: Record<string, string | undefined> = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fake',
  SUPABASE_SECRET_KEY: 'sb_secret_fake',
  CRON_SECRET: cronSecret,
};

const without = (name: string): Record<string, string | undefined> =>
  Object.fromEntries(Object.entries(valid).filter(([key]) => key !== name));

const messageOf = (record: Record<string, string | undefined>): string => {
  try {
    parseEnv(record);
  } catch (error) {
    return error instanceof Error ? error.message : 'not an Error';
  }
  return 'did not throw';
};

describe('parseEnv', () => {
  it('returns typed values for a valid record', () => {
    expect(parseEnv(valid)).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabasePublishableKey: 'sb_publishable_fake',
      supabaseSecretKey: 'sb_secret_fake',
      cronSecret,
    });
  });

  it.each([
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SECRET_KEY',
    'CRON_SECRET',
  ])('throws naming %s when it is missing', (name) => {
    expect(() => parseEnv(without(name))).toThrow(name);
  });

  it('treats an empty required variable as missing', () => {
    expect(messageOf({ ...valid, SUPABASE_SECRET_KEY: '' })).toContain(
      'SUPABASE_SECRET_KEY',
    );
  });

  it('rejects a cron secret of 31 characters and accepts 32', () => {
    expect(messageOf({ ...valid, CRON_SECRET: 'c'.repeat(31) })).toContain(
      'CRON_SECRET: must be at least 32 characters',
    );
    expect(parseEnv({ ...valid, CRON_SECRET: 'c'.repeat(32) }).cronSecret).toBe(
      'c'.repeat(32),
    );
  });

  it.each([
    'https://example.supabase.co',
    'http://localhost:54321',
    'http://127.0.0.1:54321',
    'http://[::1]:54321',
  ])('accepts the Supabase URL %s', (url) => {
    expect(
      parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: url }).supabaseUrl,
    ).toBe(url);
  });

  it.each([
    'http://example.supabase.co',
    'ftp://example.supabase.co',
    'https://',
    'not a url',
    'http://localhost.evil.example',
  ])('rejects the Supabase URL %s without echoing it', (url) => {
    const message = messageOf({ ...valid, NEXT_PUBLIC_SUPABASE_URL: url });
    expect(message).toContain(
      'NEXT_PUBLIC_SUPABASE_URL: must be an https URL (http only for localhost)',
    );
    expect(message).not.toContain(url);
  });

  it('reports every problem in one error', () => {
    const message = messageOf({});
    for (const name of Object.keys(valid)) {
      expect(message).toContain(name);
    }
  });

  it('starts without provider credentials', () => {
    const env = parseEnv(valid);
    expect(env.githubToken).toBeUndefined();
    expect(env.renderApiKey).toBeUndefined();
  });

  it('passes provider credentials through when present', () => {
    const env = parseEnv({
      ...valid,
      GITHUB_TOKEN: 'github_pat_fake',
      RENDER_API_KEY: 'rnd_fake',
    });
    expect(env.githubToken).toBe('github_pat_fake');
    expect(env.renderApiKey).toBe('rnd_fake');
  });

  it('never puts a value in the message', () => {
    const leaky = {
      ...valid,
      CRON_SECRET: 'sb_secret_looks_real_but_short',
      SUPABASE_SECRET_KEY: '',
      GITHUB_TOKEN: 'ghp_looks_real_token_value',
    };
    const message = messageOf(leaky);
    expect(message).not.toContain('sb_secret_looks_real_but_short');
    expect(message).not.toContain('ghp_looks_real_token_value');
    expect(message).not.toContain('sb_publishable_fake');
    expect(message).not.toContain('example.supabase.co');
  });
});
