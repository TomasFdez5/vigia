## Project documents

- `DESIGN.md`: visual design system (tokens, components, states, accessibility, Tailwind and CSP integration). Read it when building or reviewing UI; it wins on visual matters.
- `docs/workflow.md`: how to work with the skills and the issue tracker (prompts per phase).

## Coding standards

### Decision hierarchy

When goals conflict, decide in this order:

1. **Security**: never trade security for convenience.
2. **Correctness**: the code does what it claims in every case, not only the happy path.
3. **Readability**: a new developer understands it without an explanation.
4. **Performance**: optimize only when metrics justify it.

### Tooling

- Use `pnpm`, never `npm` or `yarn`.
- Dependency versions are exact (no `^` or `~`). Keep `minimumReleaseAge` active and never add entries to `minimumReleaseAgeExclude`: install the previous eligible version instead.
- Never weaken a check to make it pass: no lowering coverage thresholds or assertions, no lint-disable comments, no unpinning action SHAs. Fix the cause.

### TypeScript

- No `any`: use explicit types or `unknown`.
- Never index an object or array with a variable (`OBJECT[variable]`): it triggers ESLint's `security/detect-object-injection`. Use a `switch` with an exhaustive `default`, or a `Map` or the native API (e.g. `Headers` for HTTP headers).
- Components, hooks and functions are arrow functions (`const X = () => {}`), never `function` declarations or classes. Types and interfaces are the only declarations exempt from this.
- Never use classes for errors: use a factory function that returns an extended `Error` (for example with a `code` from a closed union). Port adapters follow the same rule: a factory function that returns an object satisfying the port.
- Imports are ordered: external packages → internal (`@/` alias) → relative.
- Expected failures (provider down, timeout, no permissions) are returned as `Result<T, E>`, where `E` is a closed union of error codes, never free text. Exceptions are for bugs only.
- Validate external input (third-party APIs, environment, database rows) with Zod at the boundary. Only domain types cross into the core, never provider SDK or API types.

### Comments

- All comments are in English.
- JSDoc on functions, hooks and other exported units.
- Inline comments only when strictly necessary.
- Brief and concise: say what the code does, not how. No essays.
- Never cite project documents in comments or test titles (no `SPEC §x`, `ADR`, `DESIGN §x`). Comments must stand on their own.

### Tests

- Unit tests live next to the code (`Foo.test.ts`); configuration tests live in `tests/config/`.
- Expected values come from an independent source (a literal, a worked example, the requirement), never recomputed the way the code does.
- Secret-looking fixtures are generated at runtime, never committed.
- Use in-memory fakes of ports, not mocks of internal collaborators.

### Tailwind

Avoid arbitrary values (`class-[value]`) when a reasonable equivalent exists. In order of preference:

1. A token from `DESIGN.md`, defined in `src/app/globals.css`.
2. A step of Tailwind's default scale that `globals.css` still exposes, even if not exact (e.g. `duration-[120ms]` → `duration-100`: a few milliseconds in a transition are imperceptible).
3. A one-off arbitrary value (specific layout measures, concrete grid ratios) when neither of the above applies.

Never create a single-use token just to avoid brackets: that is over-engineering. Where this conflicts with `DESIGN.md`, `DESIGN.md` wins.

## Agent skills

### Issue tracker

Issues and specs live as local markdown under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Project skills (`.claude/skills/`)

| Skill | When to use it |
|---|---|
| `tdd` | Any feature or bug fix: red → green → refactor. |
| `domain-modeling` | Domain rules (traffic light, staleness, severities, closed error codes). Maintains `GLOSSARY.md` and ADRs. |
| `codebase-design` / `improve-codebase-architecture` | Step 0 and when closing each step: structure and layer boundaries. |
| `grill-with-docs` | Before starting each step: check the plan against the documents the user provides. |
| `grill-me` | Stress-test a decision that is not covered by the documents. |
| `diagnosing-bugs` | When something fails: root cause, not a patch. |
| `code-review` | Review the diff before each commit or PR; mandatory for hosting adapters and cron endpoints. |
| `supabase` / `supabase-postgres-best-practices` | Migrations, RLS, `CHECK`, `GRANT`/`REVOKE`, pgTAP, Auth and MFA. |
| `vercel-react-best-practices` | Next.js / React code. |
| `vercel-composition-patterns` | UI components: cards, badges, tables. |
| `frontend-design` | Only within `DESIGN.md`; do not invent styles or tokens. |
| `web-design-guidelines` | Review accessibility and UX against `DESIGN.md` §8. |
| `agent-browser` | Verify the real UI (login, MFA, light/dark theme). |
| `handoff` | When cutting a session mid-step. |

Skills do not replace the project documents. On visual matters `DESIGN.md` wins; if documents contradict each other, point it out.
