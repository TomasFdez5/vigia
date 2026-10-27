import { z } from 'zod';

export interface Env {
  readonly supabaseUrl: string;
  readonly supabasePublishableKey: string;
  readonly supabaseSecretKey: string;
  readonly cronSecret: string;
  readonly githubToken: string | undefined;
  readonly renderApiKey: string | undefined;
}

// An unset or blank provider credential means "not configured".
const optionalString = z
  .string()
  .optional()
  .transform((value) => (value === '' ? undefined : value));

// The secret key travels to this URL: https only, with http allowed for the
// local Supabase CLI. Parsed, so `localhost.evil.example` does not pass.
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const urlRule = 'must be an https URL (http only for localhost)';
const isAllowedUrl = (value: string): boolean => {
  if (!URL.canParse(value)) {
    return false;
  }
  const { protocol, hostname } = new URL(value);
  return (
    protocol === 'https:' || (protocol === 'http:' && localHosts.has(hostname))
  );
};

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1)
    .pipe(z.string().refine(isAllowedUrl, { message: urlRule })),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(32),
  GITHUB_TOKEN: optionalString,
  RENDER_API_KEY: optionalString,
});

const ruleOf = (issue: z.core.$ZodIssue): string => {
  switch (issue.code) {
    // The only custom issue is urlRule above: its text is ours, not Zod's.
    case 'custom':
      return issue.message;
    case 'too_small':
      return issue.minimum === 1
        ? 'is required'
        : `must be at least ${String(issue.minimum)} characters`;
    case 'invalid_type':
      return 'is required';
    default:
      return 'is invalid';
  }
};

/**
 * Validates a record of environment variables. The error names each failing
 * variable and the violated rule; it is built from issue paths and codes only,
 * never from Zod's messages, so no value can reach it.
 */
export const parseEnv = (record: Record<string, string | undefined>): Env => {
  const result = schema.safeParse(record);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.map(String).join('.')}: ${ruleOf(issue)}`,
    );
    throw new Error(`Invalid environment: ${problems.join('; ')}`);
  }
  const data = result.data;
  return {
    supabaseUrl: data.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    supabaseSecretKey: data.SUPABASE_SECRET_KEY,
    cronSecret: data.CRON_SECRET,
    githubToken: data.GITHUB_TOKEN,
    renderApiKey: data.RENDER_API_KEY,
  };
};
