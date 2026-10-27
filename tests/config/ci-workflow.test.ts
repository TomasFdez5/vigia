import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isScalar, parse, parseDocument, visit } from 'yaml';
import { root } from './helpers';

interface Step {
  run?: string;
}

interface Job {
  permissions?: unknown;
  steps?: Step[];
}

interface Workflow {
  permissions?: unknown;
  jobs?: Record<string, Job>;
}

const shaPinned = /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/;
const tagComment = /^\s*v\d+(\.\d+){0,2}\s*$/;

const hasKey = (value: unknown, key: string): boolean => {
  if (Array.isArray(value)) return value.some((item) => hasKey(item, key));
  if (typeof value !== 'object' || value === null) return false;
  return Object.entries(value).some(
    ([name, child]) => name === key || hasKey(child, key),
  );
};

// References of every `uses` key, wherever it sits in the YAML tree, that are
// not a full SHA followed by a version tag comment.
const unpinnedActions = (text: string): string[] => {
  const unpinned: string[] = [];
  visit(parseDocument(text), {
    Pair(_, pair) {
      if (!isScalar(pair.key) || pair.key.value !== 'uses') return;
      const reference = isScalar(pair.value) ? String(pair.value.value) : '';
      const comment = isScalar(pair.value) ? (pair.value.comment ?? '') : '';
      if (!shaPinned.test(reference) || !tagComment.test(comment)) {
        unpinned.push(reference);
      }
    },
  });
  return unpinned;
};

const sha = 'a'.repeat(40);

describe('CI workflow', () => {
  const text = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8');
  const workflow = parse(text) as Workflow;
  const jobs = Object.values(workflow.jobs ?? {});

  it('never uses pull_request_target, which would run fork code with secrets', () => {
    expect(hasKey(workflow, 'pull_request_target')).toBe(false);
    expect(
      hasKey(
        parse('on:\n  pull_request_target:\njobs: {}'),
        'pull_request_target',
      ),
    ).toBe(true);
  });

  it('grants read-only contents permission and nothing else', () => {
    expect(workflow.permissions).toEqual({ contents: 'read' });
    expect(jobs.every((job) => job.permissions === undefined)).toBe(true);
  });

  it('pins every action to a 40-character SHA with its tag in a comment', () => {
    expect(unpinnedActions(text)).toEqual([]);
    expect(
      unpinnedActions(`      - uses: actions/checkout@${sha} # v1.2.3`),
    ).toEqual([]);
    for (const line of [
      '      - uses: actions/checkout@v4',
      '      - { uses: actions/checkout@v4 }',
      `      - uses: actions/checkout@${sha.slice(1)} # v1.2.3`,
      `      - uses: actions/checkout@${sha}`,
    ]) {
      expect(unpinnedActions(line)).toHaveLength(1);
    }
  });

  it('injects no expression into a shell command', () => {
    const commands = jobs.flatMap((job) =>
      (job.steps ?? []).flatMap((step) =>
        step.run === undefined ? [] : [step.run],
      ),
    );
    expect(commands.filter((run) => run.includes('${{'))).toEqual([]);
  });

  it('references no secret', () => {
    expect(text).not.toMatch(/secrets\./);
    expect(text).not.toMatch(/GITHUB_TOKEN/);
  });
});
