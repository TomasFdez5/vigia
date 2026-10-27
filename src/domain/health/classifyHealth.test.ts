import { describe, expect, it } from 'vitest';

import type { ExpectedStatus } from './ExpectedStatus';
import { classifyHealth } from './classifyHealth';

const OK_RANGE: ExpectedStatus = [{ from: 200, to: 399 }];

describe('classifyHealth', () => {
  it('classifies a fast expected response as up', () => {
    expect(
      classifyHealth(
        { kind: 'response', statusCode: 200, latencyMs: 150 },
        OK_RANGE,
      ),
    ).toBe('up');
  });

  it('keeps exactly the threshold latency as up', () => {
    expect(
      classifyHealth(
        { kind: 'response', statusCode: 200, latencyMs: 2000 },
        OK_RANGE,
      ),
    ).toBe('up');
  });

  it('classifies one millisecond over the threshold as degraded', () => {
    expect(
      classifyHealth(
        { kind: 'response', statusCode: 200, latencyMs: 2001 },
        OK_RANGE,
      ),
    ).toBe('degraded');
  });

  it('classifies an unexpected status below 500 as degraded', () => {
    expect(
      classifyHealth(
        { kind: 'response', statusCode: 404, latencyMs: 100 },
        OK_RANGE,
      ),
    ).toBe('degraded');
  });

  it('classifies a listed restricted-access status as up', () => {
    expect(
      classifyHealth({ kind: 'response', statusCode: 401, latencyMs: 100 }, [
        { from: 200, to: 399 },
        { from: 401, to: 401 },
      ]),
    ).toBe('up');
  });

  it('classifies 499 as degraded', () => {
    expect(
      classifyHealth(
        { kind: 'response', statusCode: 499, latencyMs: 100 },
        OK_RANGE,
      ),
    ).toBe('degraded');
  });

  it('classifies 500 as down', () => {
    expect(
      classifyHealth(
        { kind: 'response', statusCode: 500, latencyMs: 100 },
        OK_RANGE,
      ),
    ).toBe('down');
  });

  it('classifies a 5xx as down even when the expected list names it', () => {
    expect(
      classifyHealth({ kind: 'response', statusCode: 500, latencyMs: 100 }, [
        { from: 200, to: 599 },
      ]),
    ).toBe('down');
  });

  it('classifies a slow 5xx as down, not degraded', () => {
    expect(
      classifyHealth(
        { kind: 'response', statusCode: 503, latencyMs: 5000 },
        OK_RANGE,
      ),
    ).toBe('down');
  });

  it.each([['timeout' as const], ['dns' as const]])(
    'classifies a probe failure (%s) as down',
    (code) => {
      expect(classifyHealth({ kind: 'failure', code }, OK_RANGE)).toBe('down');
    },
  );

  it('classifies an unlisted restricted-access status as degraded', () => {
    expect(
      classifyHealth(
        { kind: 'response', statusCode: 401, latencyMs: 100 },
        OK_RANGE,
      ),
    ).toBe('degraded');
  });

  it('applies an explicit latency threshold instead of a fixed one', () => {
    expect(
      classifyHealth(
        { kind: 'response', statusCode: 200, latencyMs: 600 },
        OK_RANGE,
        500,
      ),
    ).toBe('degraded');
  });
});
