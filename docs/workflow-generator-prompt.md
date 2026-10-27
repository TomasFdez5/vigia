# Vigía: prompt generador de workflows por paso

> Documento de trabajo (español). Contiene un prompt para que un agente genere, **para un paso concreto** del plan de implementación, una versión específica de `docs/workflow.md` con los prompts de cada fase ya adaptados a ese paso.
> Resultado: `docs/workflows/step-<N>/workflow.md` (un fichero por paso).

## Cómo usarlo

1. **Sesión nueva** de Claude Code en la raíz del repositorio.
2. **No hace falta adjuntar nada**: este prompt cita los documentos de referencia por ruta y el agente los lee. Los ficheros que genera **no** los citan en el texto (ver `docs/workflow.md` §1b); solo los adjuntan con `@` en la primera línea de cada prompt, para que no haya que adjuntarlos a mano.
3. Pega el bloque de abajo y cambia `<N>` por el número de paso.
4. El agente explorará, te presentará un **plan corto** (esquema del workflow del paso, tickets propuestos, riesgos) y **esperará tu aprobación** antes de escribir el fichero.
5. Genera **un paso por vez y justo antes de empezarlo**: los pasos 1 en adelante dependen del código real que dejó el paso anterior, y un workflow generado de antemano se queda obsoleto. Tras la Fase C del paso, ejecuta el prompt «Fase C bis» que lleva el propio workflow para alinearlo con los tickets generados.

Supuestos: la ruta de salida es `docs/workflows/`, con una carpeta `step-<N>` por paso. El texto explicativo de los ficheros generados va en español y los prompts en inglés, igual que `docs/workflow.md`.

## Prompt

```text
# Role

You are a senior software engineer with 10+ years of experience, specialized in AI-assisted development: you write specifications and prompts that an agent can execute, and you review generated code critically. You master strict TypeScript, Next.js (App Router, Server Components), Clean Architecture, TDD, web application security and Tailwind CSS. You use your own judgment: you recommend and justify instead of listing options, and you flag risks before implementing.

# Goal

Generate the step-specific workflow for **Step <N>** of the implementation order: the file `docs/workflows/step-<N>/workflow.md`. It must be the project's generic workflow (`docs/workflow.md`) applied to this step: the same phases A–G, but every prompt already adapted to Step <N> and ready to paste into a fresh session.

You write documentation only. You do not implement the step.

# What to read first (in this order)

1. The reference documents, all of them, completely: `docs/reference/PRODUCT.md`, `docs/reference/FUNCTIONALITIES.md` and `docs/reference/SPEC.md`. They define the product, its scope and limits, what is expected of each functionality, the implementation order (Steps 0–7) with each step's "Done when" criteria, the technical architecture and security design, and the open decisions. They are the source of truth for what Step <N> must deliver and must not deliver.
2. `docs/workflow.md`: the template you are specializing (phases, prompt conventions, rules, skill-per-step table, risks).
3. `CLAUDE.md` and `DESIGN.md` (read the parts relevant to the step; always when the step touches UI).
4. `docs/agents/issue-tracker.md` and `docs/agents/domain.md`: how specs and tickets are stored (`.scratch/`, not versioned) and how the glossary and ADRs are laid out.
5. The `SKILL.md` of every skill you are going to name in a prompt, under `.claude/skills/`. At minimum: grill-with-docs, to-spec, to-tickets, tdd, code-review, handoff, plus the step-specific ones from the skill-per-step table in `docs/workflow.md`.
6. Repository state: `git status`, `git log`, existing code, `GLOSSARY.md` and `docs/adr/` if they exist, previous `docs/workflows/step-*/` folders and any `.scratch/step-*` folders.

If Step <N> depends on previous steps (the documents state the dependencies), verify from the repository state whether their "Done when" criteria are met. If they are not, say so before continuing and ask whether to proceed.

# Hard rules

1. **Never cite the reference documents** (`PRODUCT.md`, `FUNCTIONALITIES.md`, `SPEC.md`, or the folder they live in) by file name or path in the prose of any file you generate (explanatory text, prompt wording, ticket text). Refer to them as "the attached reference documents" plus the name of the section or topic (e.g. "the security-by-design section", "the Step <N> 'Done when' criteria"). Do not write section numbers prefixed with the file name (no "SPEC §3.3"). The only permitted mention is the `Attached:` line at the top of a prompt, as `@` paths, so the future session needs no manual attachments. Derived specifics (criteria, seams, constraints) are welcome; the prose citation is not. This is a project rule: no project file cites them in prose, and this prompt is the only place that names them freely.
2. Do not modify the reference documents, `CLAUDE.md`, `DESIGN.md`, `docs/workflow.md`, or any skill. Write only inside `docs/workflows/step-<N>/`. Create the folder if needed. If `docs/workflows/step-<N>/workflow.md` already exists, do not overwrite it: show me the differences and ask.
3. Do not commit, push, reset, install or remove dependencies, delete files, bypass hooks or act on external systems (GitHub, deployments, messages). The generated prompts must also tell the future implementing agent to ask first for each of these.
4. Do not invent. If something is not in the documents or the repository, say so. If two documents contradict each other, report it: technical matters are decided by the technical specification, visual matters by `DESIGN.md`.
5. Respect scope. Anything listed as out of scope, a known restriction or a later step must be explicitly excluded in the prompts of this step.
6. Language: explanatory text in Spanish; prompts, ticket titles, commands, paths and code identifiers in English. Specs, tickets, glossary and ADRs produced by the future sessions are in English.
7. Bake the project principles into the prompts wherever they apply to this step: honesty about unknowns ("no data" and "no alerts" never mean "safe"; a sincere gray beats a doubtful green), secure by default (deny by default, least privilege, fail closed, no trusted external data, CSP with nonce and no 'unsafe-inline'), third-party text always as bounded text, closed error codes instead of free text, color never the only status indicator, strict TypeScript without explicit `any` or `@ts-ignore`, and TDD (red → green, refactor as a separate pass).
8. Follow the repository's existing conventions before introducing new patterns.
9. **Test quality over test count.** Every implementation prompt you generate must carry the test quality rules below, verbatim, and every seam must state the risk it guards and what will not be tested. Prefer verifying through the real tool or public interface over reading a configuration file. A test that can only fail when someone edits the file under test on purpose is a mirror and must not be requested. Guard-rail tests get a mutation check. Never propose a test count as a goal.

   Test quality rules (copy into each implementation prompt):
   - Each test guards a named risk: something a user, an attacker or a later change could break. If you cannot name the risk, do not write the test.
   - Test behavior through the public interface (run the tool, call the function, lint a fixture). Do not assert that a config file contains a given line, that a file exists or what format it has, unless that file is itself the security barrier (for example the hash of a vendored binary).
   - A test that can only fail when someone edits the file under test on purpose is a mirror of the configuration: do not write it.
   - One case per distinct rule or boundary. Use a table only when each row can fail independently; do not multiply rows over data (every token, every path) when one representative plus the boundary cases catch the same defect.
   - Guard-rail tests (lint rules, thresholds, resets, hooks) get a mutation check: break the guarded thing, see the test fail, restore it.
   - Expected values come from an independent source, never recomputed the way the code does.
   - Before stopping, list the tests added, each with the risk it guards and the count; delete the ones without a named risk.

# Process

1. Explore (section above). Do not write anything yet.
2. Present a **short plan** (max ~25 lines) and wait for my approval:
   - what Step <N> delivers and its dependencies (functionality numbers included);
   - the "Done when" criteria as you understand them;
   - the proposed seams for testing, each with the risk it guards, and what will deliberately not be tested;
   - the draft ticket breakdown (title, blocked by, what verifies it, skills to use), with a note on which tickets are horizontal and why;
   - the open decisions and questions the grilling phase must settle;
   - sensitive points (security, external actions, dependency installs);
   - contradictions, gaps and assumptions, and at most 3 questions that really change the result.
3. After approval, write `docs/workflows/step-<N>/workflow.md`.
4. Verify before reporting (run the checks, don't assume): no reference document is cited in prose (grep the generated file for `PRODUCT.md`, `FUNCTIONALITIES.md`, `SPEC.md` and `docs/reference`: the only matches allowed are `@` paths on `Attached:` lines; also grep for `SPEC §`); every phase has a prompt; every ticket has its full block and no ticket placeholder (grep for `<NN>`, `<slug>`, `<title>`); the Phase C bis sync prompt exists right after Phase C; every "Done when" criterion maps to at least one seam and one ticket; the ticket dependency graph has no cycles; the prompts match the conventions of `docs/workflow.md`; every implementation prompt contains the test quality rules of hard rule 9 and every seam names its risk (grep for "guards a named risk").
5. Report in Spanish, briefly: the path written, the assumptions, the contradictions or gaps, and what I should decide next. No summary paragraph at the end.

# Sync prompt (after Phase C)

The ticket blocks are first written from the *proposed* breakdown. After Phase C the real tickets exist in `.scratch/step-<N>-<slug>/issues/` and usually differ (split, merged, renumbered, other slugs). So the generated workflow must carry, right after Phase C, a section **"Phase C bis, sync with the generated tickets"** with a ready-to-paste prompt (fenced `text` block, `Attached:` line with the spec, the issues folder, the workflow itself and `CLAUDE.md`) that tells a fresh session to:
1. List the files in the issues folder and read every ticket (number, slug, title, blocked by, status, skills, acceptance criteria, cited seams) and the spec's testing decisions.
2. Correct, in the whole workflow: the Phase C table and dependency graph; each ticket block header; every `Work on @...issues/<file>` line and every `@` path to a ticket file (including the Attached lines of the review, refactor, diagnosis and handoff prompts); ticket numbers and titles written inside prompt text; the seams of each implementation prompt so they match the acceptance criteria; the next ticket named in each handoff prompt; the list of security-sensitive tickets; the Phase G prompts and the cheat sheet.
3. Write a full block for a ticket that has none, and remove (or mark as merged) a block whose ticket no longer exists; keep done tickets as a short record.
4. Leave phases A and B and the step data sheet untouched, and add no prose citations of the reference documents.
5. Show me a summary of the changes and wait for my approval before editing.
6. Verify with commands afterwards: every cited `issues/<file>` path exists, every ticket in the folder is cited by a block, no ticket placeholder remains, no dependency cycle.
If the step already has real tickets when you generate its workflow, write the blocks from them directly and mark the section as already applied, keeping the prompt for reuse if the breakdown is reopened. This prompt edits the workflow of the step only, so it is the one case in which that file is modified after generation: it is allowed because it runs in a separate session at my request.

# Required structure of `docs/workflows/step-<N>/workflow.md`

0. **Header**: step name, functionalities covered, dependencies, "Done when" criteria, explicit scope limits (what is NOT done in this step), risks, assumptions, and the open decisions that affect the step.
1. **Phase A, decide (`/grill-with-docs`)**: a complete prompt specific to the step. List the concrete questions and ambiguities to expect, the glossary terms to settle, and ADR candidates (only decisions that are hard to reverse, surprising and a real trade-off). The prompt tells the agent to read the attached reference documents, so remind me to attach them.
2. **Phase B, spec (`/to-spec`)**: complete prompt; output at `.scratch/step-<N>-<slug>/spec.md`; actors; short user stories; proposed test seams derived from the "Done when" criteria; out-of-scope list.
3. **Phase C, tickets (`/to-tickets`)**: complete prompt plus the proposed breakdown as a table (number, title, blocked by, what verifies it, skills to use). Tickets are tracer-bullet slices; say when one is horizontal (e.g. tooling). Each ticket must fit in one fresh session and carry a "Skills to use" line.
3b. **Phase C bis, sync with the generated tickets**: the sync prompt described in the section above, placed right after Phase C.
4. **Tickets (phases D, E and F, one block per ticket)**: a short "common conventions" note (what every prompt shares: attachments, confirmation gates, the baseline-commit rule), then **one block per proposed ticket, in dependency order**, each with every prompt filled in for that ticket. No prompt inside a ticket block may contain a ticket placeholder (`<NN>`, `<slug>`, `<title>`): write the real number, file name and title. The only allowed placeholder is the baseline commit of `/code-review`, with a note on how to find it (`git log --oneline`), and the pasted output in the diagnosis prompt. Each block contains, in this order:
   1. Header: title, blocked by, what unblocks, horizontal or vertical, skills, status (todo / done).
   2. **Implement (D)**: seams to propose and confirm (each with the risk it guards and what will not be tested), the test quality rules of hard rule 9 copied verbatim, skills, dependencies to install with the reason, scope limits specific to the ticket, external actions that need my confirmation, stop condition ("Do not refactor yet").
   3. **Refactor pass (D)**: limited to the files and layers this ticket touches (named), with the codebase-design vocabulary, behavior unchanged.
   4. **If something fails (D)**: the `diagnosing-bugs` prompt naming the commands this ticket runs and the failures most likely for it (taken from the step risks and the ticket's technology).
   5. **Review (E)**: the `/code-review` prompt (fixed point, ticket and spec paths, standards sources, what to watch for in this ticket, plus a test audit: the risk each added test guards, and a request to flag mirror, duplicate or riskless tests for deletion or merge) and, only for security-sensitive tickets, the `/security-check` prompt with the focus specific to the ticket. State explicitly "not security-sensitive" when it does not apply.
   6. **Close and handoff (F)**: status update rules for this ticket and a `/handoff` prompt that names the next ticket to implement (its number, title and why it is next, or the Phase G prompt if it is the last).
   Tickets already done are kept as a short record (their implementation prompt, corrected if it was wrong), without refactor, review or handoff prompts, unless I say otherwise.
5. **Phase G, close step**: a prompt that verifies each "Done when" criterion with evidence (command and result, nothing marked as met without running it), a test audit (tests per file; flag mirror, duplicate or riskless tests and propose deletions without deleting), the `/improve-codebase-architecture` prompt focused on what this step touched, and the list of documents to update (glossary, ADRs; deviations from the reference documents are decided by me).
6. **Step-specific risks and confirmation gates**: what must be confirmed before acting (dependencies, commits, external systems, destructive actions) and the known limits of this step.
7. **Cheat sheet**: command per moment, as in the generic workflow.

Every prompt goes in a fenced `text` block, is self-contained (a fresh session knows nothing), names the files it reads and writes, states its stop condition, and includes the confirmation gates above. Prefer concrete, verifiable wording over generalities.
```

## Notas

- Este prompt sí cita los documentos de referencia por ruta. Los workflows que genera no los citan en el texto: dirán «los documentos de referencia adjuntos» y solo los nombran como `@` en la línea `Attached:` de cada prompt.
- Los bloques de ticket se escriben primero a partir del desglose propuesto. Tras la Fase C, el propio workflow lleva un prompt de «Fase C bis» que lee los identificadores y slugs reales y corrige el documento; no hace falta volver a ejecutar este generador.
- Si prefieres que los ficheros generados se versionen o se ignoren, decídelo: ahora mismo `docs/workflows/` no está en `.gitignore`, así que se versionaría.
- Si cambias la estructura de `docs/workflow.md` (fases, secciones), revisa este prompt: lo trata como plantilla.
