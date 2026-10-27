# Repository settings checklist

Settings to apply once the GitHub repository exists. No remote exists yet, so nothing below has been applied or checked: every item stays `unverified: no remote exists` until someone applies it and records the result. Applying them is an external action and needs the maintainer's confirmation.

> **Handoff:** the documentation step absorbs this list into the security guide and removes this file.

## Settings

- [ ] **Branch protection on `main`**: pull requests required and the CI check `verify` listed as a required status check (job name taken from `.github/workflows/ci.yml`; confirm the exact name GitHub shows) — unverified: no remote exists
- [ ] **No force-push and no deletion of `main`** — unverified: no remote exists
- [ ] **No administrator bypass of branch protection, and the branch up to date before merging**: with a single maintainer who is also the administrator, a rule that admins can skip protects nothing — unverified: no remote exists
- [ ] **Secret scanning** enabled. Git history is not scanned by secretlint, so this is the only cover for a secret committed and later deleted (see `docs/secret-scanning.md`) — unverified: no remote exists
- [ ] **Push protection** enabled, so a detected secret is blocked at push time — unverified: no remote exists
- [ ] **2FA on the owner account** — unverified: no remote exists
- [ ] **Dependabot alerts** enabled — unverified: no remote exists
- [ ] **Default read-only workflow permissions** (`GITHUB_TOKEN` read-only; workflows request more explicitly) — unverified: no remote exists
- [ ] **GitHub Actions cannot create or approve pull requests** (Actions settings) — unverified: no remote exists
- [ ] **Dependabot security updates** enabled, separate from alerts: they open pull requests for vulnerable dependencies and are not delayed by the `cooldown` in `.github/dependabot.yml` — unverified: no remote exists
- [ ] **Approval before workflows run on pull requests from forks** (Actions settings, fork pull request workflows) — unverified: no remote exists
- [ ] **Pinned-action policy**: require actions to be pinned to a full commit SHA, matching the pinning already used in the CI workflow — unverified: no remote exists
- [ ] **Merge method decision**: choose which methods stay enabled (squash, merge commit, rebase). Squash uses the pull request title as the commit message, so the title must pass the commit rules — unverified: no remote exists

Dependency update pull requests are merged by hand by the owner after CI passes. There is no auto-merge.

## Deferred until a second maintainer exists

- [ ] **Required code-owner review** on `main`: enable it only when a second maintainer exists. GitHub does not let an author approve their own pull request, so with a single maintainer the setting would block every merge. Until then `.github/CODEOWNERS` only names the owner of the sensitive paths — unverified: no remote exists

## Related unverified items

- Whether Dependabot supports pnpm 11.24.0 and honors the pnpm `minimumReleaseAge` is unverified. The Dependabot configuration requests a one-day `cooldown` explicitly as a mitigation.
- Whether the `cooldown` also applies to updates of actions pinned to a full commit SHA is unverified.
- Whether Dependabot commit titles stay within the 72-character header limit is unverified. Check the first real Dependabot commit.
