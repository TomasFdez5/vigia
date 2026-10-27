# Git hooks and commit rules

Hooks are installed by husky from the project's `prepare` step (`pnpm install`). They only call scripts and tools that CI also runs.

| Hook         | Runs                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `pre-commit` | `lint-staged`: secret scan on every staged file, ESLint and Prettier on code, Prettier on `json`, `css`, `yml`, `yaml` |
| `commit-msg` | `commitlint` on the message (Conventional Commits, header up to 72 characters, scope free and optional)                |
| `pre-push`   | `pnpm typecheck` and `pnpm test` (no coverage; thresholds are enforced in CI)                                          |

`pnpm commitlint:range` checks every commit of a branch against `origin/main`. It is for CI.

Markdown is not formatted by `lint-staged`, so a commit does not rewrite whole documents.

## Behavior

- **Fail closed.** If a checking tool cannot run, the hook exits with an error and the commit or push is rejected.
- **First commit.** Before the first commit `lint-staged` cannot back up the working tree and overwrites unstaged edits of staged files when a task fails, so `pre-commit` refuses to run in that case: stage or stash first.
- **Off in CI.** CI sets `HUSKY=0`: the `prepare` step installs nothing and the hooks do nothing.

## Limits

- **Hooks are a local aid and can be skipped** (`--no-verify`, a fork without `prepare`, a clone where install scripts were disabled). **CI is the real barrier**, because it repeats every check. No CI run has happened yet: there is no remote, so that barrier is defined but unverified.
- `commitlint:range` cannot be exercised without a remote. It is defined, pending.
- The secret scan does not cover git history (see `secret-scanning.md`).
