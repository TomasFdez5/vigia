import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// Scans the files git would commit: everything in the index plus untracked
// files that are not ignored. Ask git instead of globbing the directory so a
// file forced in with `git add -f` is scanned even if .gitignore lists it, and
// local ignored files such as .env.local are not.
//
// Any failure exits non-zero: outside a repository, with no files to scan, or
// when secretlint cannot run. A scan that covers nothing must not pass.
const listed = execFileSync(
  'git',
  ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);

// A file can be in the index yet deleted from disk; secretlint cannot read it.
const [files, missing] = [[], []];
for (const file of listed.split('\0').filter(Boolean)) {
  (existsSync(file) ? files : missing).push(file);
}
if (missing.length > 0) {
  console.error(`Skipped (indexed but missing on disk): ${missing.join(', ')}`);
}
if (files.length === 0) {
  console.error('No files to scan.');
  process.exit(1);
}

const chunkSize = 500;
let status = 0;
for (let i = 0; i < files.length; i += chunkSize) {
  const result = spawnSync(
    'secretlint',
    ['--no-gitignore', ...files.slice(i, i + chunkSize)],
    { stdio: 'inherit' },
  );
  // A null status means secretlint could not run at all.
  status = Math.max(status, result.status ?? 1);
}
process.exit(status);
