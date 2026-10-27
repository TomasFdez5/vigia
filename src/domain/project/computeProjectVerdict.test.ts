import { describe, expect, it } from 'vitest';

import { computeProjectVerdict } from './computeProjectVerdict';
import type { ProjectSignals } from './ProjectSignals';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const NOW = new Date(1_700_000_000_000);

const ago = (ms: number): Date => new Date(NOW.getTime() - ms);

/** Healthy, fresh signals; tests override only what they exercise. */
const healthy = (overrides: Partial<ProjectSignals> = {}): ProjectSignals => ({
  health: { status: 'up', observedAt: ago(MINUTE_MS) },
  deployment: { status: 'ready', observedAt: ago(MINUTE_MS) },
  vulnerabilities: {
    syncStatus: 'ok',
    openSeverities: [],
    observedAt: ago(MINUTE_MS),
  },
  ...overrides,
});

const health = (status: 'up' | 'degraded' | 'down', age = MINUTE_MS) => ({
  status,
  observedAt: ago(age),
});

const deployment = (
  status: 'building' | 'ready' | 'failed' | 'unknown',
  age = MINUTE_MS,
) => ({ status, observedAt: ago(age) });

const vulnerabilities = (
  syncStatus: 'ok' | 'not_enabled' | 'no_access' | 'error',
  openSeverities: readonly ('low' | 'medium' | 'high' | 'critical')[] = [],
  age = MINUTE_MS,
) => ({ syncStatus, openSeverities, observedAt: ago(age) });

describe('computeProjectVerdict', () => {
  it('reports down with probe_down for a down health check', () => {
    const verdict = computeProjectVerdict(
      healthy({ health: health('down') }),
      NOW,
    );

    expect(verdict).toStrictEqual({
      kind: 'down',
      reasons: [{ code: 'probe_down' }],
    });
  });

  it('reports down with critical_vulnerability for an open critical alert', () => {
    const verdict = computeProjectVerdict(
      healthy({ vulnerabilities: vulnerabilities('ok', ['critical']) }),
      NOW,
    );

    expect(verdict).toStrictEqual({
      kind: 'down',
      reasons: [{ code: 'critical_vulnerability' }],
    });
  });

  it('lists both down reasons when both apply', () => {
    const verdict = computeProjectVerdict(
      healthy({
        health: health('down'),
        vulnerabilities: vulnerabilities('ok', ['critical']),
      }),
      NOW,
    );

    expect(verdict).toStrictEqual({
      kind: 'down',
      reasons: [{ code: 'probe_down' }, { code: 'critical_vulnerability' }],
    });
  });

  it.each([
    {
      name: 'degraded health check',
      signals: healthy({ health: health('degraded') }),
      code: 'probe_degraded',
    },
    {
      name: 'failed deployment',
      signals: healthy({ deployment: deployment('failed') }),
      code: 'deployment_failed',
    },
    {
      name: 'open high alert',
      signals: healthy({ vulnerabilities: vulnerabilities('ok', ['high']) }),
      code: 'high_vulnerability',
    },
  ])(
    'reports degraded with its own reason for a $name',
    ({ signals, code }) => {
      expect(computeProjectVerdict(signals, NOW)).toStrictEqual({
        kind: 'degraded',
        reasons: [{ code }],
      });
    },
  );

  it('lists all degraded reasons in order when all three apply', () => {
    const verdict = computeProjectVerdict(
      {
        health: health('degraded'),
        deployment: deployment('failed'),
        vulnerabilities: vulnerabilities('ok', ['high']),
      },
      NOW,
    );

    expect(verdict).toStrictEqual({
      kind: 'degraded',
      reasons: [
        { code: 'probe_degraded' },
        { code: 'deployment_failed' },
        { code: 'high_vulnerability' },
      ],
    });
  });

  it('is operational with no reasons only when every signal is known, fresh and fine', () => {
    expect(computeProjectVerdict(healthy(), NOW)).toStrictEqual({
      kind: 'operational',
      reasons: [],
    });
  });

  it.each([
    {
      name: 'no health check',
      signals: healthy({ health: null }),
      code: 'health_missing',
    },
    {
      name: 'no deployment record',
      signals: healthy({ deployment: null }),
      code: 'deployment_missing',
    },
    {
      name: 'no vulnerability sync',
      signals: healthy({ vulnerabilities: null }),
      code: 'vulnerability_sync_missing',
    },
    {
      name: 'an unknown deployment',
      signals: healthy({ deployment: deployment('unknown') }),
      code: 'deployment_unknown',
    },
  ])(
    'reports no_recent_data with its own reason for $name',
    ({ signals, code }) => {
      expect(computeProjectVerdict(signals, NOW)).toStrictEqual({
        kind: 'no_recent_data',
        reasons: [{ code }],
      });
    },
  );

  it.each(['not_enabled', 'no_access', 'error'] as const)(
    'reports no_recent_data carrying the %s sync status',
    (syncStatus) => {
      const verdict = computeProjectVerdict(
        healthy({ vulnerabilities: vulnerabilities(syncStatus) }),
        NOW,
      );

      expect(verdict).toStrictEqual({
        kind: 'no_recent_data',
        reasons: [{ code: 'vulnerability_sync_not_ok', syncStatus }],
      });
    },
  );

  it.each([
    {
      name: 'health check',
      signals: healthy({ health: health('up', 16 * MINUTE_MS) }),
      code: 'health_stale',
    },
    {
      name: 'deployment',
      signals: healthy({ deployment: deployment('ready', 46 * MINUTE_MS) }),
      code: 'deployment_stale',
    },
    {
      name: 'vulnerability sync',
      signals: healthy({
        vulnerabilities: vulnerabilities('ok', [], 73 * HOUR_MS),
      }),
      code: 'vulnerability_sync_stale',
    },
  ])('reports no_recent_data for a stale $name', ({ signals, code }) => {
    expect(computeProjectVerdict(signals, NOW)).toStrictEqual({
      kind: 'no_recent_data',
      reasons: [{ code }],
    });
  });

  it('judges each signal against its own expected frequency', () => {
    const verdict = computeProjectVerdict(
      {
        health: health('up', 16 * MINUTE_MS),
        deployment: deployment('ready', 16 * MINUTE_MS),
        vulnerabilities: vulnerabilities('ok', [], 23 * HOUR_MS),
      },
      NOW,
    );

    expect(verdict).toStrictEqual({
      kind: 'no_recent_data',
      reasons: [{ code: 'health_stale' }],
    });
  });

  it('keeps a down check as down despite missing and stale signals', () => {
    const verdict = computeProjectVerdict(
      {
        health: health('down'),
        deployment: null,
        vulnerabilities: vulnerabilities('ok', [], 73 * HOUR_MS),
      },
      NOW,
    );

    expect(verdict).toStrictEqual({
      kind: 'down',
      reasons: [{ code: 'probe_down' }],
    });
  });

  it('keeps a degraded check as degraded despite stale and unreadable signals', () => {
    const verdict = computeProjectVerdict(
      {
        health: health('degraded'),
        deployment: deployment('ready', 46 * MINUTE_MS),
        vulnerabilities: vulnerabilities('error'),
      },
      NOW,
    );

    expect(verdict).toStrictEqual({
      kind: 'degraded',
      reasons: [{ code: 'probe_degraded' }],
    });
  });

  it('lets down beat degraded and lists only down reasons', () => {
    const verdict = computeProjectVerdict(
      {
        health: health('degraded'),
        deployment: deployment('failed'),
        vulnerabilities: vulnerabilities('ok', ['critical']),
      },
      NOW,
    );

    expect(verdict).toStrictEqual({
      kind: 'down',
      reasons: [{ code: 'critical_vulnerability' }],
    });
  });

  it.each([
    {
      name: 'stale down health check',
      signals: healthy({ health: health('down', 16 * MINUTE_MS) }),
      expected: { kind: 'down', reasons: [{ code: 'probe_down' }] },
    },
    {
      name: 'stale failed deployment',
      signals: healthy({ deployment: deployment('failed', 46 * MINUTE_MS) }),
      expected: { kind: 'degraded', reasons: [{ code: 'deployment_failed' }] },
    },
  ])('still counts a $name as known bad', ({ signals, expected }) => {
    expect(computeProjectVerdict(signals, NOW)).toStrictEqual(expected);
  });

  it.each([
    {
      name: 'critical alert with a failed sync',
      signals: healthy({
        vulnerabilities: vulnerabilities('error', ['critical']),
      }),
      expected: { kind: 'down', reasons: [{ code: 'critical_vulnerability' }] },
    },
    {
      name: 'high alert with a stale sync',
      signals: healthy({
        vulnerabilities: vulnerabilities('ok', ['high'], 73 * HOUR_MS),
      }),
      expected: { kind: 'degraded', reasons: [{ code: 'high_vulnerability' }] },
    },
  ])('counts an open $name', ({ signals, expected }) => {
    expect(computeProjectVerdict(signals, NOW)).toStrictEqual(expected);
  });

  it('keeps a building deployment operational', () => {
    const verdict = computeProjectVerdict(
      healthy({ deployment: deployment('building') }),
      NOW,
    );

    expect(verdict).toStrictEqual({ kind: 'operational', reasons: [] });
  });

  it('keeps open low and medium alerts operational', () => {
    const verdict = computeProjectVerdict(
      healthy({ vulnerabilities: vulnerabilities('ok', ['low', 'medium']) }),
      NOW,
    );

    expect(verdict).toStrictEqual({ kind: 'operational', reasons: [] });
  });

  it('honours the thresholds passed as a parameter', () => {
    const signals = healthy({ health: health('up', 4 * MINUTE_MS) });
    const thresholds = {
      healthCheckFrequencyMs: MINUTE_MS,
      deploymentSyncFrequencyMs: 15 * MINUTE_MS,
      vulnerabilitySyncFrequencyMs: 24 * HOUR_MS,
      stalenessMultiplier: 3,
    };

    expect(computeProjectVerdict(signals, NOW)).toStrictEqual({
      kind: 'operational',
      reasons: [],
    });
    expect(computeProjectVerdict(signals, NOW, thresholds)).toStrictEqual({
      kind: 'no_recent_data',
      reasons: [{ code: 'health_stale' }],
    });
  });

  it('lists every no-data reason in order when several apply', () => {
    const verdict = computeProjectVerdict(
      {
        health: null,
        deployment: deployment('unknown'),
        vulnerabilities: null,
      },
      NOW,
    );

    expect(verdict).toStrictEqual({
      kind: 'no_recent_data',
      reasons: [
        { code: 'health_missing' },
        { code: 'deployment_unknown' },
        { code: 'vulnerability_sync_missing' },
      ],
    });
  });

  it.each([
    {
      name: 'unknown deployment',
      signals: healthy({ deployment: deployment('unknown', 100 * HOUR_MS) }),
      reason: { code: 'deployment_unknown' },
    },
    {
      name: 'failed sync',
      signals: healthy({
        vulnerabilities: vulnerabilities('error', [], 100 * HOUR_MS),
      }),
      reason: { code: 'vulnerability_sync_not_ok', syncStatus: 'error' },
    },
  ])(
    'lists only one no-data reason for a long-stale $name',
    ({ signals, reason }) => {
      expect(computeProjectVerdict(signals, NOW)).toStrictEqual({
        kind: 'no_recent_data',
        reasons: [reason],
      });
    },
  );
});
