import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { join, resolve } from 'node:path';

/** Absolute path of the repository root. */
export const root = resolve(import.meta.dirname, '../..');

/**
 * Runs commitlint on a message fed through standard input, the way the
 * commit-msg hook and the commit-range script hand it over.
 */
export const lintCommitMessage = (message: string): SpawnSyncReturns<string> =>
  spawnSync(join(root, 'node_modules/.bin/commitlint'), [], {
    cwd: root,
    encoding: 'utf8',
    input: message,
  });
