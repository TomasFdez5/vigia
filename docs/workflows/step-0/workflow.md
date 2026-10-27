# Vigía: workflow del Paso 0 (preparación del proyecto y del repositorio)

> Documento de trabajo (español). Versión específica del Paso 0 de `docs/workflow.md`: mismas fases A–G, con los prompts ya adaptados.
> Los prompts están en inglés y listos para pegar en una **sesión nueva** (haz `/clear` antes de pegar). Cada prompt lleva ya sus referencias con `@` (documentos de referencia, spec, glosario, ADR, ticket), así que no hay que adjuntar nada a mano: donde el texto dice «attached reference documents» se refiere a esos `@`. Si renombras o mueves un fichero, actualiza la referencia aquí.
> Actualizado tras las fases A–C: el desglose real son **11 tickets** (ver Fase C), más los tickets 12 y 13 añadidos después y la numeración de los prompts de la Fase D coincide con los ficheros de `.scratch/step-0-setup/issues/`. Los tickets 01–06 están hechos (2026-10-27). Las fases D, E y F se reorganizan **por ticket**: cada ticket pendiente (07–11) tiene su bloque con prompts de implementación, refactor, diagnóstico, revisión y traspaso ya rellenados; los hechos quedan como registro.

## 0. Ficha del paso

|                     |                                                                                                                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Qué entrega**     | El esqueleto reproducible y seguro del proyecto: tooling, reglas automáticas de estilo, tipos y arquitectura, pruebas, hooks locales, CI definida, validación de entorno, configuración de auth versionada y la base de diseño (tokens y fuentes). |
| **Funcionalidades** | F16 (calidad y proceso de contribución) y partes de F9 (configuración de auth), F13 (credenciales: ejemplos sin secretos, detección) y F14 (reglas de seguridad de la aplicación en lint).                                                         |
| **Depende de**      | Nada.                                                                                                                                                                                                                                              |
| **Entorno**         | Node 24.22.1 y pnpm 11.24.0 instalados. Docker 26.1.4 instalado (no hace falta en este paso). La CLI de Supabase no está instalada: entra como dependencia en el ticket 08.                                                                        |

**«Hecho cuando»**

1. Un commit con un secreto de prueba es rechazado, en local y en CI.
2. La CI pasa en un proyecto vacío.
3. La arquitectura impide dependencias prohibidas entre capas.

**Decisiones ya tomadas para este paso**

- **Verificación solo local.** No hay remoto de GitHub. Los criterios 1 (parte CI) y 2 quedan **definidos pero no verificables en CI real** hasta que exista el repo; en local se ejecutan los mismos comandos que correrá la CI. Hasta entonces se informan como «pendiente», no como «cumplido».
- **pgTAP y tests de RLS en CI: fuera del paso.** Se retoman en el Paso 3, cuando existan políticas que probar.
- **Almacenamiento:** solo la configuración de auth (`config.toml`) y la CLI local. Esquema, migraciones y RLS son del Paso 3.
- **Decisiones de la Fase A** (detalle en `.scratch/step-0-setup/spec.md`, `GLOSSARY.md` y el ADR 0001): Node 24 con suelo 24.22.1; pnpm 11.24.0 con `pmOnFail: error`; cobertura por capa con `perFile`; matriz de capas completa con `app` solo hacia el contenedor; `Result` en `src/shared/`; tests colocados; tokens, modo oscuro y Geist local dentro del paso.

**Fuera de alcance (pasos posteriores)**
Reglas de negocio y casos de uso (1–2); sonda, adaptadores, repositorios, migraciones, RLS y pgTAP (3); endpoints de cron y sus workflows de programación (4); login, MFA, proxy, CSP, cabeceras, páginas, conmutador de tema, componentes e iconos (5; los tokens, el modo oscuro, la tipografía y Geist local **sí** entran en el Paso 0 por decisión de la Fase A); README, guías públicas, `SECURITY.md`, plantillas (6); despliegue, licencia y revisión final (7). Tampoco: crear el proyecto de Supabase en la nube, ejecutar `supabase config push`, crear el repo en GitHub ni tocar sus ajustes.

**Riesgos y puntos de atención**

- **Instalaciones:** el paso instala muchas dependencias; cada una requiere tu confirmación (lista con motivo por ticket).
- **Scripts de instalación:** `pnpm` los bloquea por defecto; en pnpm 11 incluso `pnpm run` falla hasta decidir cada paquete en `allowBuilds`. La CLI de Supabase y alguna herramienta de build pueden necesitar permiso explícito.
- **`minimumReleaseAge`:** si se pide una versión exacta publicada hace menos de un día, `pnpm` añade solo entradas a `minimumReleaseAgeExclude`. No se aceptan: se instala la versión anterior que cumpla el retraso (ocurrió en el ticket 01 con `typescript-eslint`).
- **Versiones fijadas por compatibilidad:** TypeScript 6.0.3 (typescript-eslint exige `<6.1.0`) y ESLint 9.39.5 (los plugins de `eslint-config-next` no soportan la 10; la 9.39.5 figura como deprecada en el registro). Revisar cuando los plugins se actualicen.
- **Hooks saltables:** husky es una ayuda local; la barrera real es la CI, y aquí aún no se puede ejecutar. Es un riesgo aceptado y debe quedar anotado.
- **Fixtures con secretos:** un fichero de prueba con un secreto falso dispararía secretlint sobre el propio repo. Los tests deben generar el fixture en tiempo de ejecución, en un directorio temporal.
- **TDD en tooling:** los tests son de configuración (fixtures, parseo de ficheros). Evitar tests tautológicos: los valores esperados salen de los criterios, no de recalcular lo que hace la configuración.
- **Docker** hace falta solo si se arranca Supabase local (`supabase start`); no es necesario para este paso.

---

## Fase 0. Antes de empezar

1. **Commit base.** `/code-review` necesita un punto fijo y el repo no tiene commits. Pide el primer commit con los ficheros actuales (`.gitignore`, `CLAUDE.md`, `DESIGN.md`, `GLOSSARY.md`, `docs/`, `.claude/`, `skills-lock.json` y, si lo decides, lo ya implementado del ticket 01). Lo confirmas tú; decide también si `.claude/skills/` y `skills-lock.json` entran.
2. Comprueba que `grilling` está instalada (lo está) y que `.scratch/` está en `.gitignore` (lo está).

## Fase A. Decidir: `/grill-with-docs` (hecha)

Sesión nueva (`/clear` antes de pegar).

```text
/grill-with-docs
Attached: @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @docs/reference/PRODUCT.md @DESIGN.md @CLAUDE.md @docs/workflows/step-0/workflow.md
We are planning Step 0 (project and repository setup) of the implementation order.
Read the attached reference documents first. Relevant parts: Step 0 and its "Done when" criteria, the quality and contribution functionality, the credentials, application-security and auth-configuration functionalities, the architecture and project structure, the conventions and tooling (errors, validation, lint rules, hooks, CI, repository settings), the phased plan (setup phase), the risks, and the pending and to-be-verified decisions. Also read the Tailwind/CSP section of DESIGN.md and CLAUDE.md.
Decisions already taken, do not reopen them: verification is local only (there is no GitHub remote); pgTAP and RLS tests in CI are out of this step; storage in this step is only the auth config.toml and the local CLI (no schema, migrations or RLS).
Respect the scope limits stated in the documents. Nothing from Steps 1-7 belongs here (no domain code, no cron endpoints, no login or UI, no tokens from DESIGN.md).
Interview me one question at a time and give your recommended answer to each. Cover at least: the Node LTS version and how it is pinned; the pnpm version and the exact allowBuilds list (verify against current pnpm docs); how to enforce the coverage threshold on domain and application while those folders are still empty; the scope of secretlint (staged files, whole repo, built client bundle); commit message rules; the exact auth settings in config.toml and the unverified jwt_expiry default; where the repository-settings checklist lives while docs/security.md does not exist yet; whether CODEOWNERS and the Dependabot config belong to this step.
Flag any contradiction between documents.
Write resolved terms to GLOSSARY.md (English, no implementation details; probably very few for this step). Propose an ADR only if the decision is hard to reverse, surprising without context and a real trade-off. Candidates: "CI is the real barrier, hooks are advisory"; "layer boundaries enforced with no-restricted-imports, no extra dependency".
Do not write code or create project files other than GLOSSARY.md and docs/adr/.
```

**Resultado real:** 21 decisiones cerradas, `GLOSSARY.md` (término _Owner_), ADR 0001 (presentación → infraestructura solo a través del contenedor) y cambios aplicados a `SPEC.md`. Dentro de la propia sesión se decidió meter tokens, modo oscuro, tipografía y Geist local en el Paso 0, algo que el prompt original excluía.

## Fase B. Spec: `/to-spec` (hecha)

Sesión nueva (`/clear` antes de pegar): el prompt ya referencia los documentos, el glosario y el ADR.

```text
/to-spec
Attached: @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @docs/reference/PRODUCT.md @DESIGN.md @CLAUDE.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @docs/workflows/step-0/workflow.md
Write the spec for Step 0 from what we just decided. Publish it to .scratch/step-0-setup/spec.md, in English.
Refer to the attached reference documents by section instead of copying them.
Actors: maintainer and contributor. Keep the user stories short and limited to what Step 0 delivers.
Propose these test seams and wait for my confirmation before publishing: (1) secretlint rejects a generated secret fixture, locally and via the same command CI will run; (2) ESLint fails on forbidden imports under the full layer matrix of SPEC §2.1 (including app importing infrastructure or any composition module other than the container, and shared/domain/application importing next, react, @supabase/*, zod or node: modules), on Date.now, new Date() without arguments and global fetch in shared/domain/application non-test files, on process.env outside the composition layer, on the admin client imported from anywhere except composition and infrastructure/supabase, on react/no-danger and on the style prop and style element, each with a forbidden and a permitted fixture; (3) the environment module fails at startup when a required variable is missing or the cron secret is shorter than 32 characters, without printing values; (4) config.toml contains the required auth settings; (5) lint, typecheck, test and build pass on the empty project; (6) commitlint rejects a non-conventional message; (7) coverage config: per-layer thresholds with perFile as in SPEC §3.3 and globs that point at existing folders; (8) the CI workflow file: minimal permissions, no pull_request_target, every action pinned to a 40-character SHA, steps calling the shared scripts in the order of SPEC §3.4; (9) design tokens: both themes define every token of DESIGN.md and contrast ratios meet DESIGN §2 (computed from the tokens); (10) fonts: files, license and provenance note exist.
Out of scope: everything in Steps 1-7, creating the Supabase cloud project, running supabase config push, creating the GitHub repository or changing its settings, pgTAP and RLS in CI.
Note in the spec that the CI criteria are defined here but only verifiable locally until a remote exists.
```

**Punto de control (tuyo):** lee `spec.md`, corrige y aprueba antes de trocear. (Hecho.)

## Fase C. Tickets: `/to-tickets` (hecha)

```text
/to-tickets @.scratch/step-0-setup/spec.md
Attached: @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md @docs/workflows/step-0/workflow.md
Break the spec into tracer-bullet tickets, in English, in .scratch/step-0-setup/issues/.
Each ticket needs: what to build, blocked by, acceptance criteria taken from the spec's testing decisions, and a "Skills to use" line naming the project skills that apply.
Tooling tickets are horizontal by nature; say so on each of them.
Start from this proposed breakdown and show me the numbered list, asking about granularity and blocking edges before writing any file. Each ticket must fit in one fresh session.
01 Project skeleton. 02 Layer and security lint rules. 03 Environment module, .env.example and .gitignore. 04 Local git hooks. 05 CI workflow (local verification only). 06 Supabase auth config and local CLI. 07 CODEOWNERS, Dependabot config and repository-settings checklist.
```

**Desglose real (aprobado):** 11 tickets, todos horizontales. Cambios respecto a la propuesta de 7: el esqueleto se parte en toolchain y marco de pruebas; los hooks en detección de secretos y commits más hooks; los tokens y las fuentes pasan a dos tickets; las reglas de lint dependen del marco de pruebas porque sus tests corren en Vitest.

| #   | Ticket (fichero)                                             | Bloqueado por | Se verifica con                                                                                 | Skills                                                                      |
| --- | ------------------------------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 01  | `01-toolchain-and-project-skeleton` (**hecho**)              | –             | `lint`, `typecheck` y `build` pasan en el proyecto vacío; instalación estricta                  | `tdd`, `codebase-design`, `security-check`                                  |
| 02  | `02-test-framework-and-coverage-thresholds`                  | 01            | `verify` pasa; test de la config de cobertura y de TS estricto                                  | `tdd`, `codebase-design`                                                    |
| 03  | `03-layer-and-security-lint-rules`                           | 01, 02        | cada fixture prohibido falla y cada permitido pasa (API de ESLint)                              | `tdd`, `codebase-design`, `improve-codebase-architecture`, `security-check` |
| 04  | `04-environment-module`                                      | 02, 03        | arrancar sin variable obligatoria falla sin imprimir valores; `.env*` ignorado salvo el ejemplo | `tdd`, `security-check`, `codebase-design`                                  |
| 05  | `05-secret-detection-scripts`                                | 02            | secreto generado en tiempo de ejecución rechazado por los scripts                               | `tdd`, `security-check`                                                     |
| 06  | `06-commit-rules-and-local-hooks`                            | 02, 05        | mensaje no convencional rechazado; commit de un secreto rechazado en un repo temporal           | `tdd`, `security-check`                                                     |
| 07  | `07-ci-workflow`                                             | 05, 06        | tests estáticos del YAML; `verify` pasa en local como sustituto de la CI                        | `tdd`, `security-check`                                                     |
| 08  | `08-supabase-cli-and-auth-config`                            | 02            | test del TOML con los valores exigidos                                                          | `supabase`, `tdd`, `security-check`                                         |
| 09  | `09-design-tokens-and-dark-mode`                             | 01, 02        | tokens en ambos temas; contraste calculado desde los tokens                                     | `frontend-design`, `web-design-guidelines`, `tdd`                           |
| 10  | `10-local-geist-fonts`                                       | 09            | SHA-256 de las fuentes y licencia verificados; `tnum` revisado a mano                           | `frontend-design`, `tdd`, `agent-browser`, `security-check`                 |
| 11  | `11-codeowners-dependabot-and-repository-settings-checklist` | 06, 07        | tests de contenido; checklist escrita, sin ejecutar nada externo                                | `security-check`, `tdd`                                                     |

Grafo: 01 → 02 → {03, 05, 08, 09}; 03 → 04; 05 → 06; {05, 06} → 07; 09 → 10; {06, 07} → 11. Sin ciclos. Tras el 02, los tickets 03, 05, 08 y 09 se pueden hacer en cualquier orden.

**Tickets añadidos después (12 y 13).** Surgieron tras ejecutar tickets anteriores y no formaban parte del desglose aprobado. Ambos son horizontales y no sensibles.

| #   | Ticket (fichero)                                 | Bloqueado por | Se verifica con                                                                                                                        | Skills                                                             |
| --- | ------------------------------------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 12  | `12-restrict-tailwind-defaults-to-design-tokens` | 09            | un color, un tamaño de texto y un radio por defecto ya no generan utilidad; todos los tokens siguen; tamaños de layout expresables     | `frontend-design`, `tdd`                                           |
| 13  | `13-base-focus-ring-and-theme-color`             | 09            | anillo `:focus-visible` con el token `focus`; `theme-color` igual a `canvas` en ambos temas; precedencia `.dark`/`.light` en navegador | `frontend-design`, `web-design-guidelines`, `tdd`, `agent-browser` |

Grafo ampliado: 09 → {10, 12, 13}. Sin ciclos. El ticket 13 sugiere hacerse junto al conmutador de tema (Paso 5); aquí se ejecuta en el Paso 0 y el conmutador queda fuera.

**Cobertura del «hecho cuando»:** secreto rechazado → 05 y 06; CI pasa en proyecto vacío → 01, 02 y 07 (solo en local); capas bloqueadas → 03.

## Fase C bis. Sincronizar este documento con los tickets generados (aplicada)

`/to-tickets` puede dividir, fusionar o renumerar respecto al desglose propuesto, y los prompts de las Fases D–G citan ficheros, números y títulos de ticket. Tras la Fase C, y siempre que cambie el desglose, se ejecuta este prompt en una sesión nueva: lee los tickets reales y corrige este documento. Para el Paso 0 ya se aplicó (los 11 ficheros citados existen en `.scratch/step-0-setup/issues/`); se conserva para reutilizarlo si se reabre el desglose.

```text
Attached: @.scratch/step-0-setup/spec.md @.scratch/step-0-setup/issues @docs/workflows/step-0/workflow.md @CLAUDE.md
Phase C is done: the tickets now exist in .scratch/step-0-setup/issues/. Update docs/workflows/step-0/workflow.md so that every prompt matches them. Edit only that file; do not touch the spec, the tickets, the reference documents or any skill.
1. List the files in .scratch/step-0-setup/issues/ and read every ticket: number, slug, title, Blocked by, Status, Skills to use, acceptance criteria and the seams it cites. Read the spec's testing decisions.
2. Compare them with the workflow and correct, in the whole document: the Phase C table and dependency graph; the header of each ticket block (title, blocked by, unblocks, skills, security-sensitive or not, status); every "Work on @.scratch/step-0-setup/issues/<file>" line and every @ path to a ticket file, including Attached lines of the review, refactor, diagnosis and handoff prompts; ticket numbers and titles written inside prompt text (for example "ticket 09" or "tickets 09 and 10"); the seams of each implementation prompt so they match the ticket's acceptance criteria; the next ticket named in each handoff prompt, following the dependency graph; the list of security-sensitive tickets and which ones get a /security-check prompt; the Phase G prompts and the cheat sheet.
3. A ticket that has no block gets a full block (implement, refactor, if it fails, review, close and handoff) written in the same style as the others. A block whose ticket no longer exists is removed, or marked as merged into the ticket that absorbed it. Tickets already done stay as a short record.
4. Do not change the Phase A and B prompts (they record what happened), the step data sheet, or anything unrelated to ticket identifiers, unless it contradicts a ticket. Do not introduce citations of the reference documents in prose; they appear only as @ paths on Attached lines.
5. Before editing, show me a summary of what will change (renamed files, renumbered tickets, new or removed blocks, changed dependencies) and wait for my approval.
6. After editing, verify with commands and report the output: every issues/<file> path cited in the workflow exists in the folder; every ticket in the folder is cited by a block; no <NN>, <slug> or <title> placeholder remains; the dependency graph has no cycles.
```

## Tickets (Fases D, E y F)

Una **sesión nueva por ticket** (`/clear` antes de pegar), por orden de dependencias. Cada ticket tiene su bloque con todos sus prompts ya rellenados, en este orden: **implementar → refactor → (si falla) diagnosticar → revisar → cerrar y traspasar**. Los tickets 01–06 están hechos y se conservan como registro (solo su prompt de implementación). Los bloques completos son los del 07 al 11.

**Convenciones comunes a todos los prompts de ticket**

- La línea `Attached:` ya lleva los `@` necesarios; no hay que adjuntar nada a mano.
- Puertas de confirmación: preguntar antes de instalar dependencias (lista con motivo), de cualquier commit y de cualquier acción externa. TypeScript estricto: sin `any` explícito ni `@ts-ignore`.
- Avisos para todo prompt que instale: verifica versiones y peers en el registro antes de pedir confirmación; respeta `minimumReleaseAge` (no aceptes entradas nuevas en `minimumReleaseAgeExclude`: instala la versión anterior elegible); no pidas la última versión si un peer la excluye.
- `/code-review` necesita un punto fijo: el único dato que rellenas a mano es el SHA del commit anterior al ticket (`git log --oneline`).
- Cierre de cada ticket: `Status: done`, criterios marcados y notas en `## Comments` del fichero del ticket.
- Orden restante: 07 → 08 → 09 → 10 → 11 → 12 → 13 (08 y 09 solo dependen del 02 y podrían ir antes que el 07; el 10 va tras el 09; el 11 tras 06 y 07; el 12 y el 13 solo dependen del 09 y pueden ir en cualquier momento después de él, siempre antes de la Fase G). El estado real de cada ticket es el campo `Status` de su fichero; los bloques de este documento no lo reflejan hasta que se ejecute la Fase C bis.

---

### Tickets 01–06 (hechos): registro

**01. Toolchain y esqueleto**

```text
Work on @.scratch/step-0-setup/issues/01-toolchain-and-project-skeleton.md.
Attached: @.scratch/step-0-setup/spec.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md @docs/workflows/step-0/workflow.md (read its section 0 for the Step 0 decisions and risks)
Read the ticket, the spec and the attached reference documents (project structure, conventions and tooling, setup phase). Set Status to in-progress.
Seams to propose and confirm, with no test runner yet (it arrives in ticket 02), so the commands themselves are the seams, red then green with a temporary fixture that is never committed: lint passes on the empty project and fails on a fixture with an explicit any, a ts-ignore comment and exported functions without return types; typecheck passes on the empty project and fails on a fixture with unchecked indexed access, a switch fallthrough and a missing return path; build passes; install fails without an allowBuilds decision and with a mismatched pnpm version; the folder layout exists.
Follow the tdd skill and codebase-design vocabulary. Use Context7 to verify current Next.js (App Router), Tailwind, ESLint flat config and pnpm 11 documentation before configuring. Pin Node 24 via the version file and engines (minimum 24.22.1), pin the package manager, use a strict lockfile, and block dependency install scripts by default, deciding allowBuilds only for what is strictly needed and confirming each entry with me.
Dependencies to list and justify before installing, after verifying versions and peer ranges in the registry: next, react, react-dom, typescript and the type packages, tailwindcss and its PostCSS plugin, eslint, eslint-config-next, typescript-eslint, prettier. Do not install anything from later tickets (test framework, Supabase client, Zod, UI libraries). Do not relax minimumReleaseAge.
Create the project by hand (not with create-next-app). Create only the first level of each layer folder (shared, domain, application, infrastructure, composition, app) with .gitkeep, plus the Supabase, configuration-tests and automation folders; no business code. Design tokens and fonts are tickets 09 and 10; the stylesheet only contains the Tailwind import.
Ask before installing, committing or any external action. Stop when the acceptance criteria pass. Do not refactor yet.
```

**02. Marco de pruebas y umbrales de cobertura**

```text
Work on @.scratch/step-0-setup/issues/02-test-framework-and-coverage-thresholds.md.
Attached: @.scratch/step-0-setup/spec.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md @docs/workflows/step-0/workflow.md (read its section 0 for the Step 0 decisions and risks)
Read the ticket, the spec and the attached reference documents (conventions and tooling, quality and contribution functionality). Set Status to in-progress.
Seams to propose and confirm: the aggregate verify command passes lint, typecheck, tests with coverage and build on the empty project; one configuration test asserts the per-layer coverage thresholds with perFile as in the quality section of the attached reference documents (shared and domain 100/100, application 100 on statements, functions and lines and 95 on branches) and that every coverage include pattern matches a folder that exists, so a mistyped pattern cannot pass vacuously; one configuration test asserts the strict TypeScript options of the conventions section. Expected values come from the attached reference documents, not from reading the configuration.
Use Context7 to verify Vitest coverage configuration and how a per-glob threshold behaves when the pattern matches no files; if it fails or reports 0%, adapt the mechanism without changing the values and record the finding.
Unit tests live next to the code; configuration tests live in the configuration-tests folder. Coverage include is limited to shared, domain and application; exclude test files, type declarations and logic-free barrels. Add the test scripts and the aggregate; later tickets add their own scripts to the aggregate.
Dependencies to list and justify after verifying versions and peers: vitest and its coverage provider, Testing Library, a DOM environment (jsdom or happy-dom), msw. Do not relax minimumReleaseAge.
Ask before installing, committing or any external action. Stop when the acceptance criteria pass. Do not refactor yet.
```

**03. Reglas de capas y seguridad en lint**

```text
Work on @.scratch/step-0-setup/issues/03-layer-and-security-lint-rules.md.
Attached: @.scratch/step-0-setup/spec.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @DESIGN.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md @docs/workflows/step-0/workflow.md (read its section 0 for the Step 0 decisions and risks)
Read the ticket, the spec, ADR 0001 and the attached reference documents (the architecture dependency rule, the lint rules for security and architecture). Set Status to in-progress.
Seams to propose and confirm: using the ESLint API on in-memory files with simulated paths, run by the test framework from ticket 02, each with a forbidden fixture that fails and a permitted counterpart that passes: (a) the full layer matrix of the dependency rule, by relative path and by the @/ alias; (b) shared, domain and application importing next, react, @supabase/*, zod or node: modules fail; (c) Date.now, new Date() without arguments and the global fetch fail in non-test files of shared, domain and application, while new Date(value) and test files pass; (d) process.env fails everywhere except composition, including destructuring; (e) the Supabase admin client imported from anywhere except composition and infrastructure/supabase fails, with no exception for cron route handlers; (f) app importing infrastructure or any composition module other than the container fails; (g) react/no-danger is an error; (h) the style prop and the style element fail.
Follow tdd, codebase-design and improve-codebase-architecture (to check the matrix against the Clean Architecture dependency rule). Use only the native ESLint rules no-restricted-imports, no-restricted-properties, no-restricted-globals and no-restricted-syntax; add no dependency for layer enforcement. Use Context7 for ESLint flat config.
Lint must keep passing on the repository as it stands. Ask before installing, committing or any external action. Stop when the acceptance criteria pass. Do not refactor yet.
```

**04. Módulo de entorno, `.env.example`, `.gitignore`**

```text
Work on @.scratch/step-0-setup/issues/04-environment-module.md.
Attached: @.scratch/step-0-setup/spec.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md @docs/workflows/step-0/workflow.md (read its section 0 for the Step 0 decisions and risks)
Read the ticket, the spec and the attached reference documents (credentials, configuration and secrets, environment variables list, cron secret rules). Set Status to in-progress.
Seams to propose and confirm: a pure parse function over an injected record: a missing required variable throws; a cron secret shorter than 32 characters throws; valid input returns typed values; error messages name the variable and rule and never contain values; provider credentials are optional at startup. Required variables: the Supabase URL, the Supabase publishable key, the Supabase secret key and the cron secret. Plus: the ignore rules exclude every environment file except the example (verify with git check-ignore); the example file contains only obviously invalid placeholders; a static check verifies the module imports the server-only marker; a manual run of the built server without the required variables fails with the expected error.
Follow tdd. A memoized accessor is the only reader of the process environment (rule from ticket 03). Validation runs at server start through instrumentation and is skipped during the build phase so CI needs no secrets: verify this with Context7 for Next 16; if it cannot be skipped cleanly, fall back to validating on first use and tell me.
Dependencies to list and justify after verifying versions and peers: zod, server-only. Do not relax minimumReleaseAge: pnpm may silently write minimumReleaseAgeExclude entries when an exact, very recent version is requested; do not keep them, install the previous eligible version instead.
Security-sensitive: after green, run /security-check on the diff before asking to commit.
Ask before installing, committing or any external action. Stop when the acceptance criteria pass. Do not refactor yet.
```

**05. Detección de secretos** (el prompt original tenía pegado el texto del ticket duplicado; corregido)

```text
Work on @.scratch/step-0-setup/issues/05-secret-detection-scripts.md.
Attached: @.scratch/step-0-setup/spec.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md @docs/workflows/step-0/workflow.md (read its section 0 for the Step 0 decisions and risks)
Read the ticket, the spec and the attached reference documents (secret detection, hooks and CI, credentials). Set Status to in-progress.
Seams to propose and confirm: the tracked-files script fails on a secret fixture generated at runtime in a temporary directory (never commit a secret-looking string, it would trip secretlint on this very repo) and passes on a clean file; the bundle script runs against a real build of the empty project; the scan passes on the repository as it stands, including the example environment file and the documentation and skills folders, with ignore entries only for demonstrated false positives, each commented.
Follow tdd. One configuration with the recommended preset serves all scopes. Add both scripts to the aggregate command, the bundle scan after the build. Record the history limit: git history is not scanned.
Dependencies to list and justify after verifying versions and peers: secretlint and its recommended preset. Do not relax minimumReleaseAge.
Security-sensitive: run /security-check on the diff before asking to commit.
Ask before installing, committing or any external action. Stop when the acceptance criteria pass. Do not refactor yet.
```

**06. Reglas de commit y hooks locales** (corregido igual que el 05)

```text
Work on @.scratch/step-0-setup/issues/06-commit-rules-and-local-hooks.md.
Attached: @.scratch/step-0-setup/spec.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md @docs/workflows/step-0/workflow.md (read its section 0 for the Step 0 decisions and risks)
Read the ticket, the spec and the attached reference documents (hooks and CI, commit convention, secret detection). Set Status to in-progress.
Seams to propose and confirm: through standard input, commitlint rejects a non-conventional message, a header over 72 characters and an unknown type, and accepts a valid message; the commit-range script is defined (it cannot be exercised without a remote: report it as pending); the pre-commit hook runs lint-staged (ESLint and Prettier on code, Prettier on other text files, the secret scan on every staged file), commit-msg runs commitlint, pre-push runs typecheck and unit tests without coverage; hooks fail closed and are disabled in CI; a test creates a throwaway git repository, points its hooks path at the project's hooks, stages a runtime-generated fake secret and checks that git commit is rejected, leaving no commit behind (if configuration resolution makes this impossible, make it a recorded manual check and tell me).
Follow tdd. Hooks are a local aid and can be skipped: record that CI is the real barrier, which cannot be verified yet (no remote). Decide with me whether lint-staged formats Markdown, given that Prettier already flags documents we did not touch.
Dependencies to list and justify after verifying versions and peers: husky, lint-staged, commitlint with the conventional config and its CLI. The prepare script of husky runs from the root project, so it needs no allowBuilds entry. Do not relax minimumReleaseAge: pnpm may silently write minimumReleaseAgeExclude entries when an exact, very recent version is requested; do not keep them, install the previous eligible version instead.
Security-sensitive: run /security-check on the diff before asking to commit.
Ask before installing, committing or any external action. Never bypass hooks. Stop when the acceptance criteria pass. Do not refactor yet.
```

---

### Ticket 07. CI (verificación local)

Bloqueado por 05, 06 · desbloquea el 11 · horizontal (automatización) · skills: `tdd`, `security-check` · **sensible** · estado: pendiente.

**07 · Implementar**

```text
Work on @.scratch/step-0-setup/issues/07-ci-workflow.md.
Attached: @.scratch/step-0-setup/spec.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md @docs/workflows/step-0/workflow.md (read its section 0 for the Step 0 decisions and risks)
Read the ticket, the spec and the attached reference documents (CI, supply chain, repository settings). Set Status to in-progress.
Seams to propose and confirm: static tests over the workflow YAML assert minimal permissions (contents read), no pull_request_target, every action pinned to a 40-character SHA, and the order and content of the steps defined in the CI section of the attached reference documents (each calling the shared package script): frozen install, lint, typecheck, tests with coverage, commit-range check, tracked-files secret scan, production audit failing on high or critical, build, bundle secret scan. Then run the aggregate command locally as the stand-in for CI and report results.
There is no remote: do not create one, do not push, and state clearly that a real CI run is still pending.
Look up current action versions and resolve their SHAs through the action repositories; do not guess SHAs, and ask me before the external lookup. If you need a YAML parser dependency, list it with the reason and ask.
Security-sensitive: run /security-check on the diff before asking to commit.
Ask before installing, committing or any external action. Stop when the acceptance criteria pass. Do not refactor yet.
```

**07 · Refactor**

```text
Attached: @.scratch/step-0-setup/issues/07-ci-workflow.md @.scratch/step-0-setup/spec.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md
Ticket 07 (CI workflow) is green. Do a refactor pass limited to the files this ticket touched: the workflow file under .github/workflows, its static test, and any package script or helper added for it.
Use the codebase-design vocabulary. Look for duplicated step definitions, test helpers that re-derive what the workflow says instead of asserting the spec, and scripts that differ between local and CI. Keep every test green, change no behavior, add no features, and do not change pinned SHAs.
Show me a summary of the diff before moving on.
```

**07 · Si algo falla**

```text
Attached: @.scratch/step-0-setup/issues/07-ci-workflow.md @.scratch/step-0-setup/spec.md @CLAUDE.md
Something failed unexpectedly while working on ticket 07 (CI workflow): <paste the failing output, redacting secrets>.
Likely areas: the YAML static tests (parsing, step order), the production audit (network, advisory database availability), the aggregate command run locally (an earlier ticket's script behaving differently outside its own test), a resolved SHA that does not match the action's tag.
Use the diagnosing-bugs skill: build a reproducible red signal first, find the root cause, and do not patch the symptom. Do not loosen an assertion or unpin an action to make it pass.
```

**07 · Revisar**

```text
/code-review
Attached: @.scratch/step-0-setup/spec.md @.scratch/step-0-setup/issues/07-ci-workflow.md @CLAUDE.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md
Spec: .scratch/step-0-setup/spec.md, ticket 07.
Standards: CLAUDE.md and the attached reference documents (conventions, CI and supply chain, security by design). Pay particular attention to: workflow permissions, every action pinned to a full SHA, no secrets exposed to the workflow, and that the CI steps call the same package scripts as local development.
For findings outside the scope of this ticket, propose new tickets in .scratch/step-0-setup/issues/ instead of fixing them here.
```

```text
/security-check
Attached: @.scratch/step-0-setup/issues/07-ci-workflow.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @CLAUDE.md
Review the changes of ticket 07 (CI workflow) against OWASP Top 10 and the security-by-design section of the attached reference documents. Focus on CI/CD supply chain: token permissions, pull_request_target and untrusted-input injection into run steps, action pinning, secrets in logs or artifacts, and whether the audit and secret scan steps fail closed. Report only; do not modify files.
```

**07 · Cerrar y traspasar**

Pasa el ticket a `Status: done`, marca los criterios y anota en `## Comments` que **la CI no se ha ejecutado de verdad (no hay remoto)**. Si cortas a medias o al terminar:

```text
/handoff Attached: @.scratch/step-0-setup/issues/07-ci-workflow.md @.scratch/step-0-setup/issues/08-supabase-cli-and-auth-config.md @.scratch/step-0-setup/spec.md @docs/workflows/step-0/workflow.md
Next session: implement ticket 08 of Step 0 (Supabase CLI and auth config), which depends only on ticket 02. Include the seams already agreed for 07, what remains pending for CI (no remote), and the open questions. Suggest the skills to load: supabase, tdd, security-check.
```

---

### Ticket 08. Supabase: CLI y config de auth

Bloqueado por 02 · desbloquea nada directo (la config se usa en el Paso 5) · horizontal · skills: `supabase`, `tdd`, `security-check` · **sensible** · estado: pendiente.

**08 · Implementar**

```text
Work on @.scratch/step-0-setup/issues/08-supabase-cli-and-auth-config.md.
Attached: @.scratch/step-0-setup/spec.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md @docs/workflows/step-0/workflow.md (read its section 0 for the Step 0 decisions and risks)
Read the ticket, the spec and the attached reference documents (auth configuration and login security, Supabase integration facts, the unverified items). Set Status to in-progress.
Use the supabase skill and verify against the current Supabase CLI documentation (config.toml keys change between versions) before writing anything.
Seams to propose and confirm: a static test over the parsed config.toml asserts sign-up disabled, email sign-up disabled, anonymous sign-ins disabled, minimum password length 12, password requirement letters and digits, and an explicit token lifetime of 3600 seconds. Expected values come from the auth configuration and token sections of the attached reference documents. Do not assert the leaked-password protection (not configurable by config push and not available on the free plan). MFA, site URL and redirect URLs are Step 5.
Scope: CLI as a pinned dev dependency, project initialization (keep the complete generated config.toml, then edit it) and a CLI version check only. No schema, migrations, RLS or pgTAP (Step 3). Do not create a cloud project, do not run supabase config push, do not start containers.
Dependencies to list and justify after verifying versions and peers: the Supabase CLI (check allowBuilds for its binary download; record the reason and confirm with me) and a TOML parser for the test. Do not relax minimumReleaseAge: pnpm may silently write minimumReleaseAgeExclude entries when an exact, very recent version is requested; do not keep them, install the previous eligible version instead.
Security-sensitive: run /security-check on the diff before asking to commit.
Ask before installing, committing or any external action. Stop when the acceptance criteria pass. Do not refactor yet.
```

**08 · Refactor**

```text
Attached: @.scratch/step-0-setup/issues/08-supabase-cli-and-auth-config.md @.scratch/step-0-setup/spec.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md
Ticket 08 (Supabase CLI and auth config) is green. Do a refactor pass limited to the files this ticket touched: the Supabase folder (config.toml and its generated companions), the configuration test and its TOML helper, and the package scripts added for the CLI.
Use the codebase-design vocabulary. Do not delete generated keys from config.toml and do not change any auth value. Keep every test green, change no behavior, add no features.
Show me a summary of the diff before moving on.
```

**08 · Si algo falla**

```text
Attached: @.scratch/step-0-setup/issues/08-supabase-cli-and-auth-config.md @.scratch/step-0-setup/spec.md @CLAUDE.md
Something failed unexpectedly while working on ticket 08 (Supabase CLI and auth config): <paste the failing output, redacting secrets>.
Likely areas: the CLI binary download blocked by allowBuilds or the install-script policy, supabase init generating keys that differ from the documentation (config.toml keys change between CLI versions), the TOML parser reading a value with another type than expected, a stray container or network call (nothing here should start Docker).
Use the diagnosing-bugs skill: build a reproducible red signal first, find the root cause, and do not patch the symptom. Do not edit an expected value to match the generated file.
```

**08 · Revisar**

```text
/code-review
Attached: @.scratch/step-0-setup/spec.md @.scratch/step-0-setup/issues/08-supabase-cli-and-auth-config.md @CLAUDE.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md
Spec: .scratch/step-0-setup/spec.md, ticket 08.
Standards: CLAUDE.md and the attached reference documents (auth configuration and login security, credentials). Pay particular attention to: every asserted value coming from the documents and not from the file, nothing from Step 3 (schema, migrations, RLS) or Step 5 (MFA, redirect URLs) creeping in, and no secret or project reference in config.toml.
For findings outside the scope of this ticket, propose new tickets in .scratch/step-0-setup/issues/ instead of fixing them here.
```

```text
/security-check
Attached: @.scratch/step-0-setup/issues/08-supabase-cli-and-auth-config.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @CLAUDE.md
Review the changes of ticket 08 (Supabase CLI and auth config) against OWASP Top 10 and the security-by-design section of the attached reference documents. Focus on fail-open auth defaults (sign-up, anonymous sign-ins, password policy, token lifetime), secrets or project identifiers committed in config.toml, and the supply chain of the CLI binary download (allowBuilds entry, pinned version, lockfile). Report only; do not modify files.
```

**08 · Cerrar y traspasar**

Pasa el ticket a `Status: done` y anota en `## Comments` lo que queda **sin verificar** (protección de contraseñas filtradas, `supabase config push` no ejecutado). Traspaso:

```text
/handoff Attached: @.scratch/step-0-setup/issues/08-supabase-cli-and-auth-config.md @.scratch/step-0-setup/issues/09-design-tokens-and-dark-mode.md @.scratch/step-0-setup/spec.md @docs/workflows/step-0/workflow.md
Next session: implement ticket 09 of Step 0 (design tokens and dark mode), which depends on tickets 01 and 02. Include the seams already agreed for 08, the unverified auth items, and the open questions. Suggest the skills to load: frontend-design (strictly within DESIGN.md), web-design-guidelines, tdd.
```

---

### Ticket 09. Tokens de diseño y modo oscuro

Bloqueado por 01, 02 · desbloquea el 10 · horizontal (tooling de diseño) · skills: `frontend-design`, `web-design-guidelines`, `tdd` · **no sensible** · estado: pendiente.

**09 · Implementar**

```text
Work on @.scratch/step-0-setup/issues/09-design-tokens-and-dark-mode.md.
Attached: @.scratch/step-0-setup/spec.md @DESIGN.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md @docs/workflows/step-0/workflow.md (read its section 0 for the Step 0 decisions and risks)
Read the ticket, the spec and DESIGN.md (sections 2, 3 and 10). Set Status to in-progress.
Use the frontend-design skill strictly within DESIGN.md: invent no styles or tokens. Use Context7 for Tailwind v4 theming.
Seams to propose and confirm: a test checks that both themes define every token of DESIGN.md; a test computes contrast ratios from the tokens and checks the color requirements of DESIGN.md section 2 (text and status text at least 4.5:1 on their surfaces, on-accent on accent at least 4.5:1, input border at least 3:1) in both themes, with thresholds taken from the document and not from recomputing its table.
Scope: color tokens as CSS variables for light and dark (system preference by default plus a manual class override), typography scale, spacing and radii, exposed to Tailwind. No theme switcher, components, icons, fonts (ticket 10) or CSP. No inline style attribute or style element anywhere.
Ask before installing (none is expected), committing or any external action. Stop when the acceptance criteria pass. Do not refactor yet.
```

**09 · Refactor**

```text
Attached: @.scratch/step-0-setup/issues/09-design-tokens-and-dark-mode.md @.scratch/step-0-setup/spec.md @DESIGN.md @GLOSSARY.md @CLAUDE.md
Ticket 09 (design tokens and dark mode) is green. Do a refactor pass limited to the files this ticket touched: the global stylesheet with the tokens, the token tests and their contrast helper.
Use the codebase-design vocabulary. Look for token names that diverge from DESIGN.md, duplicated values between themes that should reference one another, and a contrast helper that embeds expected results instead of the document's thresholds. Keep every test green, change no behavior, add no tokens, no styles and no features.
Show me a summary of the diff before moving on.
```

**09 · Si algo falla**

```text
Attached: @.scratch/step-0-setup/issues/09-design-tokens-and-dark-mode.md @.scratch/step-0-setup/spec.md @DESIGN.md @CLAUDE.md
Something failed unexpectedly while working on ticket 09 (design tokens and dark mode): <paste the failing output>.
Likely areas: a contrast ratio below the DESIGN.md threshold in one theme (the fix is a decision about DESIGN.md, not a tweak of the test: stop and ask me), Tailwind v4 theme variables not being exposed as utilities, the manual dark class override not winning over the system preference, the build failing on the stylesheet.
Use the diagnosing-bugs skill: build a reproducible red signal first, find the root cause, and do not patch the symptom. Do not change a token value or a threshold without asking me.
```

**09 · Revisar**

```text
/code-review
Attached: @.scratch/step-0-setup/spec.md @.scratch/step-0-setup/issues/09-design-tokens-and-dark-mode.md @CLAUDE.md @DESIGN.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md
Spec: .scratch/step-0-setup/spec.md, ticket 09.
Standards: CLAUDE.md, DESIGN.md (it wins on visual matters) and the attached reference documents (conventions, restrictions of the functionalities touched). Pay particular attention to: color never being the only status indicator is out of scope here but no token may contradict it, no inline style attribute or style element, no token invented beyond DESIGN.md, and both themes covered.
Use the web-design-guidelines skill for the accessibility and contrast review, since the review sub-agents do not inherit it.
For findings outside the scope of this ticket, propose new tickets in .scratch/step-0-setup/issues/ instead of fixing them here.
```

Ticket **no sensible**: no hace falta `/security-check`.

**09 · Cerrar y traspasar**

Pasa el ticket a `Status: done`, marca los criterios y anota en `## Comments` cualquier ratio que quedara justo en el umbral. Traspaso:

```text
/handoff Attached: @.scratch/step-0-setup/issues/09-design-tokens-and-dark-mode.md @.scratch/step-0-setup/issues/10-local-geist-fonts.md @.scratch/step-0-setup/spec.md @docs/workflows/step-0/workflow.md
Next session: implement ticket 10 of Step 0 (local Geist fonts), which depends on ticket 09 and includes an external download that needs my confirmation. Include the token names the fonts must wire to, the seams already agreed for 09 and the open questions. Suggest the skills to load: frontend-design, tdd, agent-browser, security-check.
```

---

### Ticket 10. Fuentes Geist locales

Bloqueado por 09 · desbloquea nada directo · horizontal · skills: `frontend-design`, `tdd`, `agent-browser`, `security-check` · **sensible** (descarga externa) · estado: pendiente.

**10 · Implementar**

```text
Work on @.scratch/step-0-setup/issues/10-local-geist-fonts.md.
Attached: @.scratch/step-0-setup/spec.md @DESIGN.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md @docs/workflows/step-0/workflow.md (read its section 0 for the Step 0 decisions and risks)
Read the ticket, the spec and DESIGN.md (sections 3 and 10). Set Status to in-progress.
Seams to propose and confirm: a test recomputes the SHA-256 of each committed font file and compares it with the provenance note, and checks that the license file contains the SIL Open Font License 1.1 text; the build makes no request to an external font host; tabular numerals support is checked manually in a real browser (use agent-browser) and recorded.
The download is an external action: ask for my confirmation first. Fetch the official release archive of vercel/geist-font into a new, empty directory, execute nothing from it, compare its SHA-256 with the digest GitHub publishes for that release (v1.8.2 when the spec was written: check it is still the intended one), and copy only the two upright variable web fonts (Sans and Mono, no italics) and the license file into the project. Write the provenance note (version, URL, SHA-256 of the archive and of each file).
Load them with the Next.js local font mechanism with a variable weight range and one CSS variable per family, wired to the theme tokens from ticket 09. Add no npm font package. Use Context7 for the local font loader.
Security-sensitive: run /security-check on the diff before asking to commit.
Ask before installing, committing or any external action. Stop when the acceptance criteria pass. Do not refactor yet.
```

**10 · Refactor**

```text
Attached: @.scratch/step-0-setup/issues/10-local-geist-fonts.md @.scratch/step-0-setup/spec.md @DESIGN.md @GLOSSARY.md @CLAUDE.md
Ticket 10 (local Geist fonts) is green. Do a refactor pass limited to the files this ticket touched: the font loader module in the app layer, the font files folder metadata (provenance note, license), the font integrity test and the wiring to the theme tokens from ticket 09.
Use the codebase-design vocabulary. Do not replace, rename or re-encode any font file, and do not change the provenance note digests. Keep every test green, change no behavior, add no features.
Show me a summary of the diff before moving on.
```

**10 · Si algo falla**

```text
Attached: @.scratch/step-0-setup/issues/10-local-geist-fonts.md @.scratch/step-0-setup/spec.md @DESIGN.md @CLAUDE.md
Something failed unexpectedly while working on ticket 10 (local Geist fonts): <paste the failing output>.
Likely areas: the archive SHA-256 not matching the digest GitHub publishes (stop: do not use the file, tell me), the local font loader failing to resolve the file path at build time, the build issuing a request to an external font host, fonts not applying through the CSS variables, tabular numerals not rendering in the browser check.
Use the diagnosing-bugs skill: build a reproducible red signal first, find the root cause, and do not patch the symptom. Never update an expected digest to match a downloaded file without telling me.
```

**10 · Revisar**

```text
/code-review
Attached: @.scratch/step-0-setup/spec.md @.scratch/step-0-setup/issues/10-local-geist-fonts.md @CLAUDE.md @DESIGN.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md
Spec: .scratch/step-0-setup/spec.md, ticket 10.
Standards: CLAUDE.md, DESIGN.md (typography section) and the attached reference documents (CSP and third-party resources, conventions). Pay particular attention to: only the two upright variable fonts and the license committed, the provenance note matching the files, no npm font package and no external font host, and no inline style.
For findings outside the scope of this ticket, propose new tickets in .scratch/step-0-setup/issues/ instead of fixing them here.
```

```text
/security-check
Attached: @.scratch/step-0-setup/issues/10-local-geist-fonts.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @CLAUDE.md
Review the changes of ticket 10 (local Geist fonts) against OWASP Top 10 and the security-by-design section of the attached reference documents. Focus on the integrity of the downloaded artifact (digest verified against the publisher, nothing executed from the archive, only the intended files copied), license compliance, and that no request to an external host is made at build or run time (compatibility with a CSP without external sources). Report only; do not modify files.
```

**10 · Cerrar y traspasar**

Pasa el ticket a `Status: done` y deja en `## Comments` el resultado de la comprobación manual de `tnum` en el navegador (es manual y no queda en un test). Traspaso:

```text
/handoff Attached: @.scratch/step-0-setup/issues/10-local-geist-fonts.md @.scratch/step-0-setup/issues/11-codeowners-dependabot-and-repository-settings-checklist.md @.scratch/step-0-setup/spec.md @docs/workflows/step-0/workflow.md
Next session: implement ticket 11 of Step 0 (CODEOWNERS, Dependabot and repository-settings checklist), which depends on tickets 06 and 07 and must not execute any external action. Include the seams already agreed for 10 and the open questions (owner handle placeholder, merge-method decision). Suggest the skills to load: security-check, tdd.
```

---

### Ticket 11. CODEOWNERS, Dependabot y lista de ajustes

Bloqueado por 06, 07 · no desbloquea nada directo (los tickets 12 y 13 dependen del 09) · horizontal · skills: `security-check`, `tdd` · **sensible** · estado: pendiente.

**11 · Implementar**

```text
Work on @.scratch/step-0-setup/issues/11-codeowners-dependabot-and-repository-settings-checklist.md.
Attached: @.scratch/step-0-setup/spec.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md @docs/workflows/step-0/workflow.md (read its section 0 for the Step 0 decisions and risks)
Read the ticket, the spec and the attached reference documents (repository settings, supply chain, risks). Set Status to in-progress.
Use Context7 to verify Dependabot's support for pnpm 11 and whether it honors the pnpm minimum release age before writing its configuration; record unverified items as unverified.
Seams to propose and confirm: content tests assert the ownership file covers the composition layer, the infrastructure layer, the automation folder and the package manager policy file (with a placeholder owner handle); the Dependabot config covers the npm and github-actions ecosystems with commit-message prefixes (chore(deps) and ci(deps)) that pass the commit rules; every item of the repository-settings checklist has a verification status.
Write the repository-settings checklist as a standalone document (the items of the repository-settings section of the attached reference documents plus the merge-method decision), each item marked "unverified: no remote exists". Note that required code-owner review is enabled only when a second maintainer exists, and add the handoff note: the documentation step absorbs the list into the security guide. Do NOT execute any of it: there is no remote and those are external actions.
Security-sensitive: run /security-check on the diff before asking to commit.
Ask before committing or any external action. Stop when the acceptance criteria pass. Do not refactor yet.
```

**11 · Refactor**

```text
Attached: @.scratch/step-0-setup/issues/11-codeowners-dependabot-and-repository-settings-checklist.md @.scratch/step-0-setup/spec.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md
Ticket 11 (CODEOWNERS, Dependabot and repository-settings checklist) is green. Do a refactor pass limited to the files this ticket touched: the ownership file, the Dependabot config, the checklist document and their content tests.
Use the codebase-design vocabulary. Look for tests that duplicate the file content instead of asserting the requirements, and checklist items stated twice. Keep every test green, change no behavior, add no features, and do not mark any checklist item as verified.
Show me a summary of the diff before moving on.
```

**11 · Si algo falla**

```text
Attached: @.scratch/step-0-setup/issues/11-codeowners-dependabot-and-repository-settings-checklist.md @.scratch/step-0-setup/spec.md @CLAUDE.md
Something failed unexpectedly while working on ticket 11 (CODEOWNERS, Dependabot and repository-settings checklist): <paste the failing output>.
Likely areas: a CODEOWNERS pattern that does not match an existing folder, a Dependabot commit-message prefix rejected by the commit rules from ticket 06, Dependabot not supporting the package manager version or ignoring the minimum release age (record as unverified, do not work around it), the content tests failing because a checklist item has no status.
Use the diagnosing-bugs skill: build a reproducible red signal first, find the root cause, and do not patch the symptom.
```

**11 · Revisar**

```text
/code-review 
Attached: @.scratch/step-0-setup/spec.md @.scratch/step-0-setup/issues/11-codeowners-dependabot-and-repository-settings-checklist.md @CLAUDE.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md
Spec: .scratch/step-0-setup/spec.md, ticket 11.
Standards: CLAUDE.md and the attached reference documents (repository settings, supply chain). Pay particular attention to: every checklist item carrying an honest "unverified" status (nothing claimed as applied), no external action executed or scripted to run automatically, and no owner handle or credential committed beyond the agreed placeholder.
For findings outside the scope of this ticket, propose new tickets in .scratch/step-0-setup/issues/ instead of fixing them here.
```

```text
/security-check
Attached: @.scratch/step-0-setup/issues/11-codeowners-dependabot-and-repository-settings-checklist.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @CLAUDE.md
Review the changes of ticket 11 (CODEOWNERS, Dependabot and repository-settings checklist) against OWASP Top 10 and the security-by-design section of the attached reference documents. Focus on whether CODEOWNERS covers the security-critical paths (composition, infrastructure, automation, package manager policy), the Dependabot update surface (ecosystems, schedule, who can merge), and whether the checklist covers the repository protections (branch protection, secret scanning, Actions permissions) without asserting any as done. Report only; do not modify files.
```

**11 · Cerrar y traspasar**

Pasa el ticket a `Status: done` y anota en `## Comments` que los ajustes del repositorio quedan **sin ejecutar** (no hay remoto). Después vienen los tickets 12 y 13 y, al terminarlos, la Fase G.

```text
/handoff Attached: @.scratch/step-0-setup/issues/11-codeowners-dependabot-and-repository-settings-checklist.md @.scratch/step-0-setup/issues/12-restrict-tailwind-defaults-to-design-tokens.md @.scratch/step-0-setup/spec.md @docs/workflows/step-0/workflow.md
Next session: implement ticket 12 of Step 0 (restrict Tailwind defaults to DESIGN.md tokens), which depends on ticket 09. Include the seams already agreed for 11, the list of items left pending because there is no remote (real CI run, repository settings) and the open questions. Suggest the skills to load: frontend-design (strictly within DESIGN.md), tdd.
```

### Ticket 12. Restringir los valores por defecto de Tailwind a los tokens de DESIGN.md

Bloqueado por 09 · desbloquea nada directo (conviene hacerlo antes del primer componente, Paso 5) · horizontal · skills: `frontend-design`, `tdd` · **no sensible** · estado: pendiente. Ticket añadido tras el 09 (ver Fase C).

**12 · Implementar**

```text
Work on @.scratch/step-0-setup/issues/12-restrict-tailwind-defaults-to-design-tokens.md.
Attached: @.scratch/step-0-setup/spec.md @DESIGN.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md @docs/workflows/step-0/workflow.md (read its section 0 for the Step 0 decisions and risks)
Read the ticket, the spec, DESIGN.md (sections 2, 3, 6 and 10) and the result of ticket 09: the stylesheet with the tokens and its exposure tests. Set Status to in-progress.
Decision first, before any test: present the two options (resetting the Tailwind theme namespaces for color, text size, radius and shadow, versus a lint rule on class names) with the trade-off of each, give your recommendation and wait for my decision. Record the decision and the trade-off in the ticket's Comments.
Use the frontend-design skill strictly within DESIGN.md: invent no styles or tokens. Use Context7 to verify Tailwind v4 theme namespaces and how a namespace is reset.
Seams to propose and confirm: a test asserts that a default-palette color, a default text size and a default radius no longer resolve to a utility, while every DESIGN.md token still does (the exposure tests from ticket 09 keep passing); the layout sizes of DESIGN.md section 6 (240, 56, 40 and 44 px) remain expressible. Expected values come from DESIGN.md, not from reading the compiled CSS. The ticket names font-bold: check whether DESIGN.md defines font weights as tokens and tell me before restricting them.
Scope: no components, theme switcher or icons. No inline style attribute or style element anywhere. Lint, typecheck, tests and build pass.
Ask before installing (none is expected), committing or any external action. Stop when the acceptance criteria pass. Do not refactor yet.
```

**12 · Refactor**

```text
Attached: @.scratch/step-0-setup/issues/12-restrict-tailwind-defaults-to-design-tokens.md @.scratch/step-0-setup/spec.md @DESIGN.md @GLOSSARY.md @CLAUDE.md
Ticket 12 (restrict Tailwind defaults to DESIGN.md tokens) is green. Do a refactor pass limited to the files this ticket touched: the global stylesheet theme block, the utility-resolution test and its helper, and the lint rule if that was the decision.
Use the codebase-design vocabulary. Look for a test helper that compiles utilities in a way that duplicates the stylesheet, and namespace resets that could be stated once. Keep every test green, change no behavior, add no tokens, no styles and no features.
Show me a summary of the diff before moving on.
```

**12 · Si algo falla**

```text
Attached: @.scratch/step-0-setup/issues/12-restrict-tailwind-defaults-to-design-tokens.md @.scratch/step-0-setup/spec.md @DESIGN.md @CLAUDE.md
Something failed unexpectedly while working on ticket 12 (restrict Tailwind defaults to DESIGN.md tokens): <paste the failing output>.
Likely areas: resetting a namespace also removing a token that ticket 09 exposed (its exposure tests turn red), the layout sizes of DESIGN.md section 6 no longer expressible after the reset, the test helper not compiling utilities the way the build does, the reset syntax not behaving as documented for the installed Tailwind version, the build failing on the stylesheet.
Use the diagnosing-bugs skill: build a reproducible red signal first, find the root cause, and do not patch the symptom. Do not add a token to DESIGN.md or the stylesheet to make a test pass.
```

**12 · Revisar**

```text
/code-review 
Attached: @.scratch/step-0-setup/spec.md @.scratch/step-0-setup/issues/12-restrict-tailwind-defaults-to-design-tokens.md @CLAUDE.md @DESIGN.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md
Spec: .scratch/step-0-setup/spec.md, ticket 12.
Standards: CLAUDE.md and DESIGN.md (it wins on visual matters). Pay particular attention to: the maintainer's decision and its trade-off recorded in the ticket, no utility outside DESIGN.md resolving (color, text size, radius, shadow), every DESIGN.md token still exposed, the section 6 layout sizes still expressible, and no inline style attribute or style element.
For findings outside the scope of this ticket, propose new tickets in .scratch/step-0-setup/issues/ instead of fixing them here.
```

Ticket **no sensible**: no hace falta `/security-check`.

**12 · Cerrar y traspasar**

Pasa el ticket a `Status: done`, marca los criterios y anota en `## Comments` la decisión (reset de namespaces o regla de lint) y su trade-off. Traspaso:

```text
/handoff Attached: @.scratch/step-0-setup/issues/12-restrict-tailwind-defaults-to-design-tokens.md @.scratch/step-0-setup/issues/13-base-focus-ring-and-theme-color.md @.scratch/step-0-setup/spec.md @docs/workflows/step-0/workflow.md
Next session: implement ticket 13 of Step 0 (base focus ring and theme-color), which depends on ticket 09. Include the decision taken in 12 about Tailwind namespaces, the seams already agreed and the open questions. Suggest the skills to load: frontend-design (strictly within DESIGN.md), web-design-guidelines, tdd, agent-browser.
```

---

### Ticket 13. Anillo de foco base y `theme-color`

Bloqueado por 09 (el ticket sugiere hacerlo junto al conmutador de tema del Paso 5; aquí se ejecuta en el Paso 0 y el conmutador queda fuera) · desbloquea nada directo · horizontal · skills: `frontend-design`, `web-design-guidelines`, `tdd`, `agent-browser` · **no sensible** (la compatibilidad con la CSP se revisa en `/code-review`) · estado: pendiente. Ticket añadido tras el 09 (ver Fase C).

**13 · Implementar**

```text
Work on @.scratch/step-0-setup/issues/13-base-focus-ring-and-theme-color.md.
Attached: @.scratch/step-0-setup/spec.md @DESIGN.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md @docs/workflows/step-0/workflow.md (read its section 0 for the Step 0 decisions and risks)
Read the ticket, the spec, DESIGN.md (sections 2, 8 and 10) and the attached reference documents (the CSP and security headers parts, to keep theme-color compatible). Set Status to in-progress.
Use the frontend-design skill strictly within DESIGN.md: invent no styles or tokens. Use Context7 for Tailwind v4 base layer rules and for the Next.js viewport and theme-color metadata of the installed version.
Seams to propose and confirm: a test asserts the global base rule gives interactive elements a :focus-visible ring using the focus token, 2 px ring and 2 px offset, and that no outline is removed without a replacement; a test asserts the theme-color value equals the canvas token in both themes, read from the tokens and not duplicated, with no inline style and nothing that needs a CSP exception; the light/dark override precedence (system dark, .dark, .light) and the focus ring in both themes are checked by hand in a real browser with the agent-browser skill, and the result is recorded in the ticket's Comments.
Scope: the switcher itself, components and icons are out. If following the manual .dark/.light override in theme-color requires a script, do not add one: report it to me, because that belongs to the switcher in Step 5. No inline style attribute or style element anywhere. Lint, typecheck, tests and build pass.
Ask before installing (none is expected), committing or any external action. Stop when the acceptance criteria pass. Do not refactor yet.
```

**13 · Refactor**

```text
Attached: @.scratch/step-0-setup/issues/13-base-focus-ring-and-theme-color.md @.scratch/step-0-setup/spec.md @DESIGN.md @GLOSSARY.md @CLAUDE.md
Ticket 13 (base focus ring and theme-color) is green. Do a refactor pass limited to the files this ticket touched: the global stylesheet base rule, the root layout metadata or viewport export that sets theme-color, and their tests.
Use the codebase-design vocabulary. Look for the focus values or the canvas color duplicated outside the tokens, and test helpers that re-read the stylesheet instead of asserting DESIGN.md. Keep every test green, change no behavior, add no tokens, no styles and no features.
Show me a summary of the diff before moving on.
```

**13 · Si algo falla**

```text
Attached: @.scratch/step-0-setup/issues/13-base-focus-ring-and-theme-color.md @.scratch/step-0-setup/spec.md @DESIGN.md @CLAUDE.md
Something failed unexpectedly while working on ticket 13 (base focus ring and theme-color): <paste the failing output>.
Likely areas: the focus ring not visible or below the contrast required by DESIGN.md on canvas in one theme (a decision about DESIGN.md: stop and ask me), the base rule losing to Tailwind's layer order, the theme-color metadata export not emitting the expected tag in the installed Next.js version, the .dark/.light override not taking precedence over the system preference, agent-browser failing to launch or to emulate the dark color scheme.
Use the diagnosing-bugs skill: build a reproducible red signal first, find the root cause, and do not patch the symptom. Do not change a token value or remove an outline to make a check pass.
```

**13 · Revisar**

```text
/code-review <sha-of-the-commit-before-ticket-13>
Attached: @.scratch/step-0-setup/spec.md @.scratch/step-0-setup/issues/13-base-focus-ring-and-theme-color.md @CLAUDE.md @DESIGN.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md
Spec: .scratch/step-0-setup/spec.md, ticket 13.
Standards: CLAUDE.md, DESIGN.md (accessibility section; it wins on visual matters) and the attached reference documents (CSP, conventions). Pay particular attention to: the focus ring using the focus token with 2 px ring and 2 px offset on :focus-visible, no outline removed without a replacement, theme-color derived from the canvas token in both themes, nothing inline and nothing that would need a CSP exception, and the real-browser result recorded in the ticket.
Use the web-design-guidelines skill for the accessibility review, since the review sub-agents do not inherit it.
For findings outside the scope of this ticket, propose new tickets in .scratch/step-0-setup/issues/ instead of fixing them here.
```

Ticket **no sensible**: no hace falta `/security-check`.

**13 · Cerrar y traspasar**

Pasa el ticket a `Status: done`, marca los criterios y deja en `## Comments` el resultado de la comprobación manual en el navegador (ambos temas y la precedencia `.dark`/`.light`). Es el último ticket del paso: el siguiente trabajo es la Fase G.

```text
/handoff Attached: @.scratch/step-0-setup/issues/13-base-focus-ring-and-theme-color.md @.scratch/step-0-setup/spec.md @docs/workflows/step-0/workflow.md
Next session: close Step 0 (Phase G of the workflow). All thirteen tickets are done. Include the list of items left pending because there is no remote (real CI run, repository settings), the deviations from the reference documents found so far, and any findings from the code reviews that became new tickets. Suggest the skills to load: improve-codebase-architecture.
```

## Fase G. Cerrar el paso

```text
Attached: @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @.scratch/step-0-setup/spec.md @.scratch/step-0-setup/issues @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md @docs/workflows/step-0/workflow.md
Check each "Done when" criterion of Step 0 in the attached reference documents against the repository, and report each as met / not met / pending with the command you ran and its result as evidence. Do not mark anything as met without running it.
Criteria 1 and 2 involve CI and there is no remote: verify the local equivalents (hook rejection with a runtime-generated fake secret, and the same lint, typecheck, test, build, audit and secretlint commands) and report the CI part as pending, not met.
Criterion 3: run the layer-boundary fixtures.
List any deviation from the attached reference documents that we introduced.
```

```text
/improve-codebase-architecture
Attached: @docs/reference/SPEC.md @GLOSSARY.md @docs/adr/0001-presentation-reaches-infrastructure-only-through-composition.md @CLAUDE.md
Focus on what Step 0 touched: the folder structure, the layer rules and the composition root. Report only; I will pick which opportunity to pursue.
```

Después: actualizar `GLOSSARY.md`/ADR si cambió algo; las desviaciones respecto a los documentos de referencia las decides tú. **Pendiente al salir del paso:** crear el repo en GitHub y ejecutar de verdad la CI y los ajustes de la lista del ticket 11 (acciones externas, con tu confirmación).

## Puertas de confirmación del paso

- **Antes de actuar:** instalar o quitar dependencias, cualquier commit o push, borrar o sobrescribir ficheros, saltarse hooks, y todo lo que toque sistemas externos (GitHub, Supabase en la nube).
- **Límites conocidos:** la CI no se ha ejecutado nunca; los hooks se pueden saltar; los tests de este paso son de configuración, no de comportamiento de negocio.

## Chuleta

| Momento          | Comando                                                                   | Resultado                         |
| ---------------- | ------------------------------------------------------------------------- | --------------------------------- |
| Antes de empezar | commit base (con tu confirmación)                                         | punto fijo para `/code-review`    |
| Decidir          | `/grill-with-docs`                                                        | decisiones, glosario/ADR          |
| Escribir         | `/to-spec`                                                                | `.scratch/step-0-setup/spec.md`   |
| Trocear          | `/to-tickets`                                                             | `issues/01…13`                    |
| Sincronizar      | prompt de la Fase C bis                                                   | workflow alineado con los tickets |
| Cada ticket      | bloque «NN · Implementar» del ticket                                      | código y tests, sin refactor      |
| Tras el verde    | bloque «NN · Refactor»                                                    | pasada separada                   |
| Algo falla       | bloque «NN · Si algo falla»                                               | causa raíz                        |
| Revisar          | bloque «NN · Revisar» (`/code-review` + `/security-check` si es sensible) | informes                          |
| Cerrar / cortar  | bloque «NN · Cerrar y traspasar» (`/handoff`)                             | resumen en `$TMPDIR`              |
| Cerrar           | verificación + `/improve-codebase-architecture`                           | evidencias e informe              |
