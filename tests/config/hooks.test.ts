import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { root } from './helpers';

// A hook runs from the root of the repository being committed to, with the
// project's binaries on PATH (husky adds node_modules/.bin the same way).
function runHook(name: string, cwd: string, env: Record<string, string> = {}) {
  return spawnSync('sh', ['-e', join(root, '.husky', name)], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${join(root, 'node_modules/.bin')}:${process.env['PATH'] ?? ''}`,
      ...env,
    },
  });
}

function git(cwd: string, ...args: string[]) {
  return spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
    },
  });
}

// Built at run time so this file never contains a secret-looking string.
const fakeGithubToken = (): string =>
  ['gh', 'p_', 'aB3dE5gH7jK9mN1pQ3sT5vW7yZ9bC1eF3hJ5'].join('');

let repo: string;

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'vigia-hooks-'));
  git(repo, 'init', '-q');
  git(repo, 'config', 'user.email', 'test@example.invalid');
  git(repo, 'config', 'user.name', 'Test');
  // Like the secrets test, the fixture repository borrows the project's
  // configuration: tools resolve it from the repository being committed to.
  for (const file of [
    'commitlint.config.mjs',
    'lint-staged.config.mjs',
    '.prettierrc.json',
    '.secretlintrc.json',
  ]) {
    copyFileSync(join(root, file), join(repo, file));
  }
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('lint-staged tasks', () => {
  it('formats other text files with Prettier but leaves Markdown alone', () => {
    writeFileSync(join(repo, 'data.json'), '{"a":1,\n"b":[1,2]}\n');
    writeFileSync(join(repo, 'notes.md'), '#   Title\n*   item\n');
    git(repo, 'add', 'data.json', 'notes.md');

    const result = runHook('pre-commit', repo);

    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(repo, 'data.json'), 'utf8')).toBe(
      '{ "a": 1, "b": [1, 2] }\n',
    );
    expect(readFileSync(join(repo, 'notes.md'), 'utf8')).toBe(
      '#   Title\n*   item\n',
    );
  });

  it('scans every staged file for secrets, whatever its type', () => {
    for (const name of ['config.txt', 'config.json', 'notes.md']) {
      writeFileSync(join(repo, name), `token=${fakeGithubToken()}\n`);
      git(repo, 'add', name);

      expect(runHook('pre-commit', repo).status, name).not.toBe(0);

      git(repo, 'reset', '-q', name);
    }
  });
});

describe('installation', () => {
  const install = (env: Record<string, string>) => {
    spawnSync(join(root, 'node_modules/.bin/husky'), [], {
      cwd: repo,
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });
    return git(repo, 'config', 'core.hooksPath').stdout.trim();
  };

  it('points git at the generated hooks when the prepare step runs', () => {
    expect(install({ HUSKY: '1' })).toBe('.husky/_');
  });

  it('installs nothing in CI, where HUSKY=0', () => {
    expect(install({ HUSKY: '0' })).toBe('');
  });
});

describe('fail closed', () => {
  // No node, pnpm or project binaries on PATH: every checking tool is missing.
  const bare = { PATH: '/usr/bin:/bin' };

  it.each(['pre-commit', 'pre-push'])(
    '%s fails when its tool cannot run',
    (hook) => {
      writeFileSync(join(repo, 'notes.txt'), 'clean\n');
      git(repo, 'add', 'notes.txt');

      expect(runHook(hook, repo, bare).status).not.toBe(0);
    },
  );

  it('commit-msg fails when commitlint cannot run', () => {
    writeFileSync(join(repo, 'msg'), 'feat: add thing\n');

    const result = spawnSync(
      'sh',
      ['-e', join(root, '.husky/commit-msg'), 'msg'],
      {
        cwd: repo,
        encoding: 'utf8',
        env: { ...process.env, ...bare },
      },
    );

    expect(result.status).not.toBe(0);
  });
});

describe('git commit in a throwaway repository', () => {
  const commit = (message: string) =>
    spawnSync('git', ['commit', '-q', '-m', message], {
      cwd: repo,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        PATH: `${join(root, 'node_modules/.bin')}:${process.env['PATH'] ?? ''}`,
      },
    });
  const hasCommit = (): boolean =>
    git(repo, 'rev-parse', '--verify', '-q', 'HEAD').status === 0;

  beforeEach(() => {
    git(repo, 'config', 'core.hooksPath', join(root, '.husky'));
  });

  it('rejects a staged secret and leaves no commit behind', () => {
    writeFileSync(join(repo, 'config.txt'), `token=${fakeGithubToken()}\n`);
    git(repo, 'add', 'config.txt');

    const result = commit('feat: add config');

    expect(result.status).not.toBe(0);
    expect(hasCommit()).toBe(false);
  });

  it('rejects a non-conventional message', () => {
    writeFileSync(join(repo, 'notes.txt'), 'clean\n');
    git(repo, 'add', 'notes.txt');

    expect(commit('update stuff').status).not.toBe(0);
    expect(hasCommit()).toBe(false);
  });

  it('accepts a clean file with a valid message, so the rejections are not a broken setup', () => {
    writeFileSync(join(repo, 'notes.txt'), 'clean\n');
    git(repo, 'add', 'notes.txt');

    const result = commit('feat: add notes');

    expect(result.status, result.stderr).toBe(0);
    expect(hasCommit()).toBe(true);
  });
});

describe('secret scan of force-added files', () => {
  it('still scans a staged file that .gitignore lists', () => {
    writeFileSync(join(repo, '.gitignore'), '.env.local\n');
    writeFileSync(join(repo, '.env.local'), `token=${fakeGithubToken()}\n`);
    git(repo, 'add', '-f', '.env.local');

    expect(runHook('pre-commit', repo).status).not.toBe(0);
  });
});

describe('first commit, before lint-staged can back anything up', () => {
  it('refuses to run when staged files have unstaged edits, and leaves the edits untouched', () => {
    writeFileSync(join(repo, 'notes.txt'), 'staged\n');
    git(repo, 'add', 'notes.txt');
    writeFileSync(join(repo, 'notes.txt'), 'staged\nunstaged edit\n');

    const result = runHook('pre-commit', repo);

    expect(result.status).not.toBe(0);
    expect(readFileSync(join(repo, 'notes.txt'), 'utf8')).toBe(
      'staged\nunstaged edit\n',
    );
  });
});
