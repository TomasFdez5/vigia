# Secret scanning

One secretlint configuration (`.secretlintrc.json`, recommended preset) serves every scope.

| Scope                                                   | Command               | When                                                         |
| ------------------------------------------------------- | --------------------- | ------------------------------------------------------------ |
| Files git would commit (index + untracked, not ignored) | `pnpm secrets`        | Locally and in CI                                            |
| Client bundle (`.next/static`)                          | `pnpm secrets:bundle` | **After `pnpm build`**; it fails if there is no build output |

`pnpm secrets` asks git for the file list (`scripts/scan-tracked-files.mjs`), so a file forced in with `git add -f` is scanned even if `.gitignore` lists it, while ignored local files such as `.env.local` are not. It fails closed: outside a git repository, with no files to scan, or if secretlint cannot run. The staged-files scope in the pre-commit hook also uses `--no-gitignore` for the same reason.

`pnpm verify` runs both in that order. The staged-files scope belongs to the pre-commit hook.

`secrets:bundle` passes `--no-gitignore` on purpose: secretlint skips gitignored paths and `.next/` is ignored, so without it the scan would cover nothing.

## Limits

- **Git history is not scanned.** A secret that was committed and later deleted is covered only by repository-level secret scanning and push protection. They cannot be enabled without a remote, so they are unverified (see the repository settings checklist).
- Local hooks can be bypassed; CI is the real barrier.
- Ignore entries (`.secretlintignore`) are allowed only for a demonstrated false positive, each with a comment recording the evidence. There are none today.
- Test fixtures containing fake secrets are generated at run time in a temporary directory, never committed.
