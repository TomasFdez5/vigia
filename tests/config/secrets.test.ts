import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { root } from './helpers';

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

// Runs a package script's command line the way `pnpm run` does (project
// binaries on PATH) but from a directory of our choosing, so the fixture can
// live outside the repository. Project script files are resolved to the
// project, since the fixture directory does not have them.
function runScript(name: string, cwd: string) {
  const command = pkg.scripts[name]?.replace(
    'scripts/',
    `${join(root, 'scripts')}/`,
  );
  if (command === undefined) throw new Error(`Missing script: ${name}`);
  return spawnSync('sh', ['-c', command], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${join(root, 'node_modules/.bin')}:${process.env['PATH'] ?? ''}`,
    },
  });
}

const output = (result: { stdout: string; stderr: string }): string =>
  result.stdout + result.stderr;

// Built at run time so this file never contains a secret-looking string and
// the repository's own scan stays green.
function fakeGithubToken(): string {
  return ['gh', 'p_', 'aB3dE5gH7jK9mN1pQ3sT5vW7yZ9bC1eF3hJ5'].join('');
}

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'vigia-secrets-'));
  // The tracked-files scan asks git what to scan, so the fixture is a repository.
  spawnSync('git', ['init', '-q'], { cwd: dir });
  // One configuration serves every scope: the fixture directory borrows it.
  copyFileSync(
    join(root, '.secretlintrc.json'),
    join(dir, '.secretlintrc.json'),
  );
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('secret scan of tracked files', () => {
  it('fails on a runtime-generated secret', () => {
    writeFileSync(join(dir, 'config.txt'), `token=${fakeGithubToken()}\n`);

    const result = runScript('secrets', dir);

    expect(result.status).not.toBe(0);
  });

  it('fails on a secret in a file that .gitignore lists but git tracks', () => {
    writeFileSync(join(dir, '.gitignore'), '.env.local\n');
    writeFileSync(join(dir, '.env.local'), `token=${fakeGithubToken()}\n`);
    spawnSync('git', ['add', '-f', '.env.local'], { cwd: dir });

    const result = runScript('secrets', dir);

    expect(result.status).not.toBe(0);
  });

  it('does not scan an ignored file that git does not track', () => {
    writeFileSync(join(dir, '.gitignore'), '.env.local\n');
    writeFileSync(join(dir, '.env.local'), `token=${fakeGithubToken()}\n`);

    const result = runScript('secrets', dir);

    expect(result.status).toBe(0);
  });

  it('fails closed outside a git repository instead of scanning nothing', () => {
    const outside = mkdtempSync(join(tmpdir(), 'vigia-no-git-'));
    try {
      copyFileSync(
        join(root, '.secretlintrc.json'),
        join(outside, '.secretlintrc.json'),
      );
      writeFileSync(join(outside, 'notes.txt'), 'clean\n');

      expect(runScript('secrets', outside).status).not.toBe(0);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('is not derailed by a file that is indexed but deleted from disk', () => {
    writeFileSync(join(dir, 'gone.txt'), 'clean\n');
    writeFileSync(join(dir, 'kept.txt'), 'clean\n');
    spawnSync('git', ['add', 'gone.txt', 'kept.txt'], { cwd: dir });
    rmSync(join(dir, 'gone.txt'));

    expect(runScript('secrets', dir).status).toBe(0);
  });

  it('passes on a clean file', () => {
    writeFileSync(join(dir, 'notes.txt'), 'nothing to see here\n');

    const result = runScript('secrets', dir);

    expect(result.status).toBe(0);
  });

  it('passes on the repository as it stands', () => {
    const result = runScript('secrets', root);

    expect(output(result)).toBe('');
    expect(result.status).toBe(0);
  });
});

describe('secret scan of the client bundle', () => {
  it('fails on a secret inside .next/static even though .next is gitignored', () => {
    mkdirSync(join(dir, '.next/static'), { recursive: true });
    writeFileSync(join(dir, '.gitignore'), '.next/\n');
    writeFileSync(
      join(dir, '.next/static/chunk.js'),
      `var t="${fakeGithubToken()}";\n`,
    );

    const result = runScript('secrets:bundle', dir);

    expect(result.status).toBe(1);
  });

  it('fails closed when there is no build output to scan', () => {
    const result = runScript('secrets:bundle', dir);

    expect(result.status).not.toBe(0);
  });

  it('passes on a real build of the project', { timeout: 300_000 }, () => {
    const build = spawnSync('pnpm', ['build'], { cwd: root, encoding: 'utf8' });
    expect(build.status).toBe(0);

    const result = runScript('secrets:bundle', root);

    expect(output(result)).toBe('');
    expect(result.status).toBe(0);
  });
});
