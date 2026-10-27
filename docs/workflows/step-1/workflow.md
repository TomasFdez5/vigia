# Vigía: workflow del Paso 1 (reglas de negocio)

> Documento de trabajo (español). Versión específica del Paso 1 de `docs/workflow.md`: mismas fases A–G, con los prompts ya adaptados.
> Los prompts están en inglés y listos para pegar en una **sesión nueva** (haz `/clear` antes de pegar). Cada prompt lleva ya sus referencias con `@` (documentos de referencia, spec, glosario, ADR, ticket), así que **no hay que adjuntar nada a mano**: donde el texto dice «attached reference documents» se refiere a esos `@`. Si renombras o mueves un fichero, actualiza la referencia aquí.
> Estado de partida: el Paso 0 se da por concluido y está subido al remoto (commit `2ae73c3`, «chore: first commit»). Los tickets del Paso 1 ya existen en `.scratch/step-1-business-rules/issues/` y los bloques de abajo están sincronizados con ellos (Fase C bis ejecutada).

## 0. Ficha del paso

|                     |                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Qué entrega**     | Las reglas puras del dominio: clasificación de salud, disponibilidad, obsolescencia de datos, gravedades, estados de despliegue y semáforo del proyecto, más el tipo `Result` en `shared` y los códigos de error cerrados. Es el primer código de negocio y el primero que ejercita de verdad el umbral de cobertura por fichero. |
| **Funcionalidades** | F2 (clasificación de salud), F3 (disponibilidad) y F6 (semáforo y obsolescencia): solo la parte de reglas. Tocan también F4 y F5 en lo que se refiere a los tipos de estado de despliegue y gravedad.                                                                                                                             |
| **Depende de**      | Paso 0 (concluido). Comprobado en el repositorio: `lint`, `typecheck` y `test:coverage` pasan; las carpetas `shared`, `domain` y `application` están vacías (solo `.gitkeep`); la CI está definida pero su primera ejecución real depende del remoto (ver Fase 0).                                                                |

**«Hecho cuando» (criterios del paso)**

Todos los casos tienen prueba y cobertura por encima del umbral: respuesta rápida, lenta, no encontrada, respuesta esperada de acceso restringido, error del servidor, tiempo agotado y gravedad desconocida.

| Criterio                                                                                                  | Seam                                                             | Ticket                                     |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------ |
| Respuesta rápida, lenta, no encontrada, acceso restringido esperado, error del servidor                   | S1 clasificación de salud, S2 parser de estados esperados        | 02                                         |
| Tiempo agotado                                                                                            | S1 (el fallo de la sonda con código `timeout` entra como `down`) | 02                                         |
| Gravedad desconocida                                                                                      | S1 de gravedad (desconocida → `high`)                            | 03                                         |
| Cobertura sobre el umbral (100 % por fichero en `shared` y `domain`)                                      | comprobación de mutación sobre la cobertura                      | 01, y cada ticket al pasar `test:coverage` |
| Reglas incluidas en el paso aunque no estén en la lista de casos: disponibilidad, obsolescencia, semáforo | S1 de cada ticket                                                | 04, 05, 06                                 |

**Fuera de alcance (pasos posteriores)**

Casos de uso, puertos y fakes en memoria (Paso 2); la sonda HTTP, los adaptadores de Vercel y Render, la fuente de GitHub, repositorios, migraciones, `CHECK` en base de datos, RLS y parseo con Zod (Paso 3); endpoints de cron (Paso 4); login, páginas, componentes, iconos, etiquetas y estilos del semáforo (Paso 5); documentación pública (Paso 6); despliegue (Paso 7). El dominio no importa Next, React, Supabase, Zod ni módulos `node:`, no usa `fetch` y no lee la hora (la hora entra como argumento). No hay `Clock` en este paso: es un puerto de la capa de aplicación.

**Riesgos y puntos de atención**

- **Falso verde.** Es el defecto más caro del producto: un monitor que dice «todo bien» sin saberlo. Las reglas de obsolescencia, de datos ausentes y de gravedad desconocida existen para impedirlo; los tickets 03 y 06 llevan `/security-check` centrado en rutas que fallan abiertas.
- **Ramas inalcanzables y cobertura del 100 %.** El `default` exhaustivo de un `switch` suele ser una rama que ningún test alcanza, y no se permiten comentarios que ignoren cobertura ni `eslint-disable`. Hay que resolverlo con el diseño de los tipos (Fase A fija el patrón), no con parches.
- **Ficheros solo de tipos y barriles.** Pueden aparecer en la cobertura como 0/0 o no aparecer. El ticket 01 lo comprueba con una mutación antes de confiar en el umbral.
- **Consultas por clave.** Un objeto literal devuelve propiedades heredadas (`constructor`); el proyecto prohíbe indexar con variable. Usar `switch` exhaustivo o `Map`.
- **Exceso de tests.** El Paso 0 acabó con 453 tests, casi todos de configuración. En este paso cada test protege un riesgo con nombre y prueba comportamiento por la interfaz pública; los prompts llevan las reglas y la auditoría de tests.
- **Datos del dominio sin fuente única.** Umbrales (2000 ms, 3× la frecuencia, 50 % de checks esperados) son parámetros con valores por defecto con nombre, no literales escondidos; su origen real (entorno) llega en el Paso 2 o posterior.
- **Limpieza pendiente fuera de este paso.** Hay comentarios en `eslint.config.mjs` y `.gitignore` que citan secciones de documentos, contra la regla de comentarios de `CLAUDE.md`. No se toca aquí: se propondrá un ticket aparte si lo apruebas.

**Supuestos (a confirmar o corregir en la Fase A)**

- La disponibilidad es una regla pura de dominio que recibe conteos ya acotados a la ventana; seleccionar los checks de una ventana es del Paso 2 y 3.
- El semáforo se calcula entero en el dominio y la interfaz solo lo pinta; los nombres de sus valores se fijan en la Fase A.
- La obsolescencia se mide desde el momento en que se observó el dato (check o sincronización), no desde la fecha del despliegue o de la alerta.
- No hay dependencias nuevas en ningún ticket.
- No hay ticket 07: la Fase A decidió no reconsiderar `exactOptionalPropertyTypes`.

**Decisiones abiertas que afectan al paso**

1. Frecuencia de comprobación de salud (propuesta de 5 minutos) y umbral de obsolescencia (3× la frecuencia de cada proceso): son valores iniciales de las reglas.
2. Reconsiderar `exactOptionalPropertyTypes` tras este paso (decisión diferida explícitamente).
3. Precedencia entre gris y rojo o ámbar, tratamiento de despliegue desconocido, de sincronización de vulnerabilidades sin datos y de proyecto sin ningún check: no están cerradas en los documentos. Es lo que más pesa en la Fase A.

---

## Fase 0. Antes de empezar

1. **Punto fijo de `/code-review`.** Ya existe el commit `2ae73c3` («chore: first commit»): es el punto fijo del ticket 01. Para los siguientes tickets, el punto fijo es el commit anterior al ticket (`git log --oneline`); los commits los confirmas tú.
2. **Estado del Paso 0.** Los tickets 01 y 07 de `.scratch/step-0-setup/issues/` figuran como `in-progress` aunque todos sus criterios están marcados: pásalos a `Status: done` a mano (`.scratch/` no se versiona).
3. **Primera ejecución real de la CI.** El repo ya está en el remoto: mira la pestaña Actions de GitHub y apunta el resultado de la primera ejecución del workflow. No bloquea el Paso 1, pero lo que falle ahí es del Paso 0 y no de este paso. Los ajustes del repositorio de la lista del Paso 0 siguen siendo acciones externas con tu confirmación.
4. Comprueba que `grilling` y `domain-modeling` están instaladas (lo están) y que `.scratch/` está en `.gitignore` (lo está).

## Fase A. Decidir: `/grill-with-docs`

Sesión nueva (`/clear` antes de pegar). Los documentos de referencia ya van adjuntos por `@` en el prompt; no hace falta adjuntarlos a mano.

```text
/grill-with-docs
Attached: @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @docs/reference/PRODUCT.md @DESIGN.md @CLAUDE.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @docs/workflows/step-1/workflow.md
We are planning Step 1 (business rules) of the implementation order: the pure domain rules for health classification, availability, data staleness, severities, deployment states and the project verdict, plus the Result type and the closed error codes.
Read the attached reference documents first. Relevant parts: Step 1 and its "Done when" criteria, the health, history, availability and stale-data functionalities, the project traffic light, the domain rules section (classification, uptime, stale data, global state, sync rules), the normalized error codes, the architecture and dependency rule, the conventions (Result, determinism, coverage thresholds), the honesty and security-by-design principles, the vulnerability and deployment functionalities where they define states and severities, and the pending and to-be-verified decisions. Also read the state vocabulary section of DESIGN.md (the verdict is computed in the domain, the interface only paints it) and CLAUDE.md. Read GLOSSARY.md and docs/adr/, and inspect src/ and eslint.config.mjs to see the real constraints on domain code.
Decisions already taken, do not reopen them: Step 0 is concluded; the domain imports nothing but shared; time enters as an argument (no Clock in this step); errors are Result with closed unions, never free text; no dependencies are installed in this step.
Respect the scope limits stated in the documents. Nothing from Steps 2-7 belongs here (no use cases or ports, no HTTP probe, no adapters, no storage, no Zod parsing, no UI labels or icons).
Interview me, one round of questions at a time, giving your recommended answer to each. Cover at least:
1. Names of the verdict values in the domain (by meaning, as the design vocabulary does, or by color) and of the health, deployment and severity values; which of them the interface will need to distinguish (for example "Degraded" versus "Needs attention") and whether the verdict carries closed reason codes or only the value.
2. Precedence between gray and red or amber: when the last check is `down` or a critical vulnerability is open but some data is stale, which wins? Recommended: gray only ever replaces green, so a known-bad signal is never hidden and stale data never improves a project.
3. A deployment in `unknown`: does it keep a project green? How is a project with no deployment record treated?
4. A vulnerability sync that is not enabled, has no access or failed: what verdict does it produce, given that "no data" and "no alerts" never mean "safe"?
5. A project with no health check recorded yet.
6. Which signals can be stale (health check, deployment sync, vulnerability sync), what expected frequency each uses (5 minutes, 15 minutes, daily), whether staleness is measured from the observation time (recommended) and what happens with a future or invalid timestamp (recommended: stale).
7. Expected-status semantics: whether a 5xx listed as expected is still `down`, what a 1xx means, what the final status is after redirects, how whitespace, inverted ranges, out-of-range codes and an empty list are handled, and the closed error code of the parser.
8. Latency boundary (more than 2000 ms is degraded, exactly 2000 is up) and whether the project timeout plays any role in classification.
9. The probe outcome model: a response with status code and latency, or a failure with a closed code, as a discriminated union that makes an invalid state unrepresentable. Which failure codes are down (all of them, recommended).
10. Availability: counts already windowed (recommended) or a list of checks; the formula for expected checks (window divided by frequency) and the rounding at the minimum-data boundary; ratio or percentage in the result; behaviour with more checks than expected and with a non-positive frequency; the exact shape of "no data".
11. Severity: the order, the conversion of an unknown or differently cased string to `high`, and which vulnerability states count as open.
12. Deployment status: does the domain normalize an unrecognized string to `unknown`, or is that only the adapters' job plus validation at the edge? Recommended: only if a rule in this step uses it.
13. Result: the smallest useful API and where the closed error-code unions live in the domain.
14. How to satisfy 100% branch coverage on exhaustive switches without coverage-ignore or lint-disable comments (type design, a Map, a tested assertion function).
15. Folder layout under src/domain and whether to use barrels (they are excluded from coverage and must hold no logic); time representation (Date values).
16. Where the default thresholds live and how they stay configurable.
17. Whether to reconsider exactOptionalPropertyTypes now, as the documents deferred it until after this step (this decides whether ticket 07 exists).
Glossary terms to settle (English, no implementation details): Project, Health check, Probe, Probe outcome, Health status, Uptime, Stale, Verdict, Severity, Deployment status, Vulnerability sync. Use the glossary's existing style (see Owner).
ADR: propose one only if the decision is hard to reverse, surprising without context and a real trade-off. The only likely candidate is the gray-versus-red precedence; skip the others (they are already stated in the documents or enforced by lint).
Flag any contradiction between the documents, or between them and the existing code.
Do not write code or create project files other than GLOSSARY.md and docs/adr/.
```

**Resultado esperado:** decisiones cerradas y escritas, términos en `GLOSSARY.md`, como mucho un ADR, y el sí o no al ticket 07.

## Fase B. Spec: `/to-spec`

```text
/to-spec
Attached: @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @docs/reference/PRODUCT.md @DESIGN.md @CLAUDE.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @docs/workflows/step-1/workflow.md
Write the spec for Step 1 (business rules) from what we just decided. Publish it to .scratch/step-1-business-rules/spec.md, in English.
Refer to the attached reference documents by section or topic instead of copying them.
Actors: maintainer, contributor, and the future use cases that will call the rules. Keep the user stories short and limited to what Step 1 delivers.
Propose these test seams and wait for my confirmation before publishing; for each one state the risk it guards and what will NOT be tested:
(1) health classification: a probe outcome plus the project's expected-status definition and the latency threshold yield up, degraded or down, covering fast, slow (with the 2000 ms boundary), not found, expected restricted access, server error and timeout;
(2) the expected-status parser: valid definitions parse, malformed ones fail closed with a closed error code;
(3) severity: unknown input becomes `high`, the order is correct, inherited property names are not mistaken for severities;
(4) deployment status normalization, only if the domain keeps it;
(5) staleness: boundary at exactly three times the frequency, missing, future and invalid dates;
(6) availability: the minimum-data boundary, degraded counted as available, empty window, more checks than expected;
(7) the project verdict: every rule and every precedence decision, never green with stale, missing or unknown data, only open vulnerabilities count;
(8) a guard-rail check, not a test file: the per-file coverage threshold bites on real files, including type-only files and barrels.
Not tested: plain constants, type exports (typecheck covers them), file existence or format, HTTP, storage, UI.
Map every "Done when" criterion of Step 1 to at least one seam.
Out of scope: everything in Steps 2-7: use cases, ports, fakes, the HTTP probe, adapters, Zod parsing, database constraints, endpoints, pages, labels, icons and styles.
Note in the spec that exactOptionalPropertyTypes is reconsidered here only if Phase A decided so.
```

**Punto de control (tuyo):** lee `spec.md`, corrige y aprueba antes de trocear.

## Fase C. Tickets: `/to-tickets`

```text
/to-tickets @.scratch/step-1-business-rules/spec.md
Attached: @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @CLAUDE.md @docs/workflows/step-1/workflow.md
Break the spec into tracer-bullet tickets, in English, in .scratch/step-1-business-rules/issues/.
Each ticket needs: what to build, blocked by, acceptance criteria taken from the spec's testing decisions (each citing the seam it verifies), and a "Skills to use" line naming the project skills that apply.
Step 1 has no UI, storage or infrastructure to cut through: a vertical slice here goes from the input type to the tested rule through the public interface of the domain. Say which tickets are horizontal (tooling or shared types) and why.
Start from this proposed breakdown and show me the numbered list, asking about granularity and blocking edges before writing any file. Each ticket must fit in one fresh session.
01 Result type and closed error codes. 02 Health classification. 03 Severity ordering and closed signal types. 04 Data staleness. 05 Uptime availability. 06 Project status verdict.
```

**Desglose acordado**

| #   | Ticket (fichero)                    | Tipo               | Bloqueado por | Se verifica con                                                                                                                                                        | Skills                                                        |
| --- | ----------------------------------- | ------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 01  | `01-result-and-closed-error-codes`  | horizontal         | ninguno       | Seams 0 y 8: `Result` con valores falsy; mutación: la cobertura por fichero falla si falta un test o hay una rama sin cubrir (fichero solo de tipos, barril, `switch` sin `default`) | `tdd`, `domain-modeling`, `codebase-design`                   |
| 02  | `02-health-classification`          | vertical (dominio) | 01            | Seams 1 y 2: los 6 casos de salud, la frontera de 2000 ms, 499/500 y 5xx esperado que sigue `down`; el parser falla cerrado                                            | `tdd`, `domain-modeling`, `codebase-design`                   |
| 03  | `03-severity-and-closed-signal-types` | vertical (dominio) | 01          | Seam 3: orden correcto; gravedad desconocida, vacía, en otra capitalización o heredada → `high`                                                                        | `tdd`, `domain-modeling`, `security-check`                    |
| 04  | `04-data-staleness`                 | vertical (dominio) | 01            | Seam 5: frontera exacta de 3×, dato ausente, fecha futura o inválida → obsoleto                                                                                        | `tdd`, `domain-modeling`                                      |
| 05  | `05-uptime-availability`            | vertical (dominio) | 01            | Seam 6: frontera del 50 %, `degraded` cuenta, ventana vacía o no positiva, más checks que los esperados                                                                | `tdd`, `domain-modeling`                                      |
| 06  | `06-project-status-verdict`         | vertical (dominio) | 02, 03, 04    | Seam 7: cada regla y cada precedencia; nunca `operational` con datos obsoletos, ausentes o desconocidos                                                                | `tdd`, `domain-modeling`, `codebase-design`, `security-check` |

Grafo: 01 → {02, 03, 04, 05}; {02, 03, 04} → 06; el 05 no desbloquea nada dentro del paso (lo consume el Paso 2). Sin ciclos. El orden de ejecución propuesto es 01, 02, 03, 04, 05, 06; tras el 01, los tickets 02 a 05 pueden ir en cualquier orden.

**Por qué hay un ticket horizontal.** El 01 es un cimiento: tipos compartidos y la comprobación de que la cobertura por fichero muerde sobre código real, incluido el patrón de `switch` sin `default`. Los demás son cortes verticales dentro del dominio: no hay base de datos ni UI que atravesar en este paso, así que «vertical» significa que cada ticket entrega una regla completa, probada por su interfaz pública. No hay ticket 07: la Fase A decidió no reconsiderar `exactOptionalPropertyTypes`.

**Cobertura del «hecho cuando».** Casos de salud y tiempo agotado → 02; gravedad desconocida → 03; cobertura sobre el umbral → 01 y todos los tickets; disponibilidad, obsolescencia y semáforo → 05, 04 y 06.

## Fase C bis. Sincronizar este documento con los tickets generados

Estado: **ejecutada** (los tickets existen y este documento está sincronizado con ellos). Tras la Fase C, y siempre que cambie el desglose, se ejecuta este prompt en una sesión nueva. Este es el único caso en que este fichero se modifica después de generarse, y está permitido porque lo ejecutas tú en una sesión aparte.

```text
Attached: @.scratch/step-1-business-rules/spec.md @.scratch/step-1-business-rules/issues @docs/workflows/step-1/workflow.md @CLAUDE.md
Phase C is done: the tickets now exist in .scratch/step-1-business-rules/issues/. Update docs/workflows/step-1/workflow.md so that every prompt matches them. Edit only that file; do not touch the spec, the tickets, the reference documents or any skill.
1. List the files in .scratch/step-1-business-rules/issues/ and read every ticket: number, slug, title, Blocked by, Status, Skills to use, acceptance criteria and the seams it cites. Read the spec's testing decisions.
2. Compare them with the workflow and correct, in the whole document: the Phase C table and dependency graph; the header of each ticket block (title, blocked by, unblocks, skills, vertical or horizontal, security-sensitive or not, status); every "Work on @.scratch/step-1-business-rules/issues/<file>" line and every @ path to a ticket file, including the Attached lines of the review, refactor, diagnosis and handoff prompts; ticket numbers and titles written inside prompt text; the seams of each implementation prompt so they match the ticket's acceptance criteria; the next ticket named in each handoff prompt, following the dependency graph; the list of security-sensitive tickets and which ones get a /security-check prompt; the Phase G prompts and the cheat sheet.
3. A ticket that has no block gets a full block (implement, refactor, if it fails, review, close and handoff) written in the same style as the others, including the test quality rules and the confirmation gates. A block whose ticket no longer exists is removed or marked as merged into the ticket that absorbed it. Tickets already done stay as a short record.
4. Do not change Phase A, Phase B, the step data sheet or anything unrelated to ticket identifiers, unless it contradicts a ticket. Do not introduce citations of the reference documents in prose; they appear only as @ paths on Attached lines.
5. Before editing, show me a summary of what will change (renamed files, renumbered tickets, new or removed blocks, changed dependencies) and wait for my approval.
6. After editing, verify with commands and report the output: every issues/<file> path cited in the workflow exists in the folder; every ticket in the folder is cited by a block; no ticket placeholder (<NN>, <slug>, <title>) remains; the dependency graph has no cycles.
```

## Tickets (Fases D, E y F)

Una **sesión nueva por ticket** (`/clear` antes de pegar), en orden de dependencias. Cada ticket tiene su bloque con todos sus prompts ya rellenados: **implementar → refactor → (si falla) diagnosticar → revisar → cerrar y traspasar**.

**Convenciones comunes a todos los prompts de ticket**

- La línea `Attached:` ya lleva los `@` necesarios; no hay que adjuntar nada a mano.
- Puertas de confirmación en cada prompt: preguntar antes de instalar o quitar dependencias, de cualquier commit, push o reset, de borrar ficheros, de saltarse hooks y de toda acción sobre sistemas externos. TypeScript estricto: sin `any` explícito ni `@ts-ignore`.
- Ningún ticket instala dependencias: si el agente cree que hace falta una, debe parar y preguntar.
- Las reglas de calidad de tests van copiadas en cada prompt de implementación y cada seam nombra el riesgo que protege.
- **Regla del commit base:** `/code-review` necesita un punto fijo. El único dato que rellenas a mano es `<BASELINE_SHA>`, el SHA del commit anterior al ticket (`git log --oneline`). Para el ticket 01 es `2ae73c3`. Los commits los pide el agente y los confirmas tú; haz uno por ticket para que el siguiente tenga punto fijo.
- Cierre de cada ticket: `Status: done`, criterios marcados y notas en `## Comments` del fichero del ticket.
- Orden propuesto: 01 → 02 → 03 → 04 → 05 → 06. Tras el 01, los tickets 02, 03, 04 y 05 pueden ir en cualquier orden; el 06 va el último. No hay ticket 07: la Fase A decidió no reconsiderar `exactOptionalPropertyTypes`. El estado real de cada ticket es el campo `Status` de su fichero.

---

### Ticket 01. Result type and closed error codes

Bloqueado por ninguno · desbloquea 02, 03, 04 y 05 · horizontal (cimiento: tipos compartidos y primer código bajo la regla de cobertura) · skills: `tdd`, `domain-modeling`, `codebase-design` · no sensible · estado: ready-for-agent (`01-result-and-closed-error-codes.md`).

**01 · Implementar**

```text
Work on @.scratch/step-1-business-rules/issues/01-result-and-closed-error-codes.md.
Attached: @.scratch/step-1-business-rules/spec.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @CLAUDE.md @docs/workflows/step-1/workflow.md
Read the ticket, the spec and the attached reference documents (conventions (errors as Result, validation at the edges), the normalized error codes, the architecture layers, the coverage thresholds), plus GLOSSARY.md and docs/adr/. Set the ticket's Status to in-progress.
Build: the `Result<T, E>` type in `shared` (free of business concepts) with `ok`, `err`, `isOk` and `isErr`, and the two closed unions of error codes as domain types under `src/domain/errors`, one file each: the probe codes (`timeout`, `dns`, `connection`, `tls`, `too_many_redirects`, `invalid_url`, `unexpected`) and the hosting/source codes (`unauthorized`, `forbidden`, `not_found`, `rate_limited`, `upstream_error`, `invalid_response`, `missing_credentials`). This is also the first real code under the per-file coverage thresholds, so the ticket proves those thresholds actually bite and decides the exhaustive-switch pattern the later tickets follow.
Not in this ticket: any business rule, Zod, a Clock, probe or adapter code, `Result` helpers nobody needs yet (map, flatMap, unwrap), error codes beyond the two closed lists (the expected-status parser's own code belongs to ticket 02). Nothing from Steps 2-7.
Follow the tdd skill, using the skills listed in the ticket's "Skills to use" line. Propose the seams for this ticket (each with the risk it guards and what will not be tested) and wait for my confirmation before writing any test, then work one red test, minimal green, repeat. Seams to propose and confirm:
- Seam S1 `Result` public interface, seam 0 of the spec (constructors and narrowing); guards a named risk: a failure, or a successful but falsy value (0, empty string, null), read as the opposite branch, which would let an error pass as data in every later rule. Will not test: that type exports exist, and the members of the error-code unions (typecheck already covers both).
- Seam S2 guard-rail check on coverage enforcement, seam 8 of the spec (a mutation check, not a test file); guards a named risk: the 100% per-file threshold passing vacuously on real files, for example a type-only file, a logic-free barrel or a file never loaded by a test. Will not test: nothing is added as a test: record the evidence in the ticket Comments.
For S2: add one real file with an uncovered branch and see `pnpm run test:coverage` fail, delete a test and see it fail, then restore. Also check what the coverage report does with a file that contains only types, with an `index.ts` barrel and with a fully tested `switch` over a closed union that has no `default` branch, and report it; if that switch does not reach 100 % branches, record the alternative that does (never a coverage-ignore comment). Do not change the coverage configuration without asking me.
Follow the existing code conventions: arrow functions only (no `function` declarations, no classes), `readonly` interface fields, no optional properties (use an explicit `T | null`; exactOptionalPropertyTypes stays off), never index an object or array with a variable (use an exhaustive `switch` with no `default` over closed internal unions, a `default` only where the input is an untrusted string and tests reach it, or a `Map`), expected failures returned as `Result<T, E>` with a closed union of error codes, JSDoc in English on exported units, no citation of project documents in comments or test titles, imports ordered external, then `@/`, then relative. Time enters as an argument (`now: Date` or already-built dates); never `Date.now()` or `new Date()` without arguments in domain code. No coverage-ignore comments and no lint-disable comments: if a branch cannot be reached, change the design, not the check.
Test quality rules, for every test you write:
- Each test guards a named risk: something a user, an attacker or a later change could break. If you cannot name the risk, do not write the test.
- Test behavior through the public interface (run the tool, call the function, lint a fixture). Do not assert that a config file contains a given line, that a file exists or what format it has, unless that file is itself the security barrier (for example the hash of a vendored binary).
- A test that can only fail when someone edits the file under test on purpose is a mirror of the configuration: do not write it.
- One case per distinct rule or boundary. Use a table only when each row can fail independently; do not multiply rows over data (every token, every path) when one representative plus the boundary cases catch the same defect.
- Guard-rail tests (lint rules, thresholds, resets, hooks) get a mutation check: break the guarded thing, see the test fail, restore it.
- Expected values come from an independent source, never recomputed the way the code does.
- Before stopping, list the tests added, each with the risk it guards and the count; delete the ones without a named risk.
Dependencies: none expected; if you think one is needed, stop and ask.
External actions: none. This ticket touches no system outside the repository.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
Stop when the acceptance criteria pass. Do not refactor yet.
```

**01 · Refactor**

```text
Attached: @.scratch/step-1-business-rules/issues/01-result-and-closed-error-codes.md @.scratch/step-1-business-rules/spec.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @CLAUDE.md
Ticket 01 (Result type and closed error codes) is green. Do a refactor pass limited to the files this ticket touched: `src/shared` (the Result file and its test) and the error-code files under `src/domain`.
Use the codebase-design vocabulary (module, interface, depth, seam, locality). Look for: names that leak business concepts into `shared`, duplicated narrowing helpers, error-code unions declared in more than one place.
Keep every test green, change no behavior, add no features, and add no tests. Do not touch other layers.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
Show me a summary of the diff before moving on.
```

**01 · Si algo falla**

```text
Attached: @.scratch/step-1-business-rules/issues/01-result-and-closed-error-codes.md @.scratch/step-1-business-rules/spec.md @CLAUDE.md
Something failed unexpectedly while working on ticket 01 (Result type and closed error codes): <paste the failing output, redacting secrets>.
Commands this ticket runs: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test:coverage`.
Likely areas: coverage reporting 0/0 or ignoring a new file (glob, barrel exclusion, type-only file); `explicit-module-boundary-types` on exported constructors; `isolatedModules` requiring `export type` for re-exported types; a `switch` over a closed union counting an uncovered branch, with or without a `default`.
Use the diagnosing-bugs skill: build a reproducible red signal first, find the root cause, and do not patch the symptom. Do not lower a threshold, loosen an assertion, add a lint-disable or coverage-ignore comment, or weaken a check to make it pass.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
```

**01 · Revisar**

```text
/code-review 2ae73c3
Attached: @.scratch/step-1-business-rules/spec.md @.scratch/step-1-business-rules/issues/01-result-and-closed-error-codes.md @CLAUDE.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md
Spec: .scratch/step-1-business-rules/spec.md, ticket 01 (Result type and closed error codes).
Standards: CLAUDE.md and the attached reference documents (conventions, the domain rules and the architecture layers). Pay particular attention to: `Result` carries no business vocabulary; the error-code unions are exactly the closed lists of the attached reference documents and never free text; no classes; barrels hold no logic; the coverage evidence is recorded; the Result test stays small.
Also audit the tests added by this ticket: for each one, state the risk it guards. Report as findings the tests that only mirror a configuration file, repeat another test, multiply rows over data, or cannot fail for any reason other than a deliberate edit, and propose deleting or merging them (do not delete anything). Give the count of tests added.
For findings outside the scope of this ticket, propose new tickets in .scratch/step-1-business-rules/issues/ instead of fixing them here.
```

`/security-check`: no sensible. Este ticket no toca secretos, red, autenticación ni entrada externa; el riesgo de integridad (falso verde) se cubre en la revisión de código.

**01 · Cerrar y traspasar**

Pasa el ticket a `Status: done`, marca los criterios y anota en `## Comments` los tests añadidos con el riesgo que protege cada uno y su número. Registra en `## Comments` la evidencia de la mutación de cobertura y cómo se comportan los ficheros solo de tipos y los barriles. Haz el commit del ticket (lo confirmas tú) para que el siguiente tenga punto fijo. Si cortas a medias o al terminar:

```text
/handoff Attached: @.scratch/step-1-business-rules/issues/01-result-and-closed-error-codes.md @.scratch/step-1-business-rules/issues/02-health-classification.md @.scratch/step-1-business-rules/spec.md @docs/workflows/step-1/workflow.md
Next session: implement ticket 02 of Step 1 (Health classification), because it is the first business rule and covers six of the seven "Done when" cases (after ticket 01, tickets 02 to 05 are all unblocked and may go in any order). Include the seams already agreed for ticket 01, the decisions of Phase A that ticket 02 depends on, and the open questions. Suggest the skills to load: tdd, domain-modeling, codebase-design.
```

---

### Ticket 02. Health classification

Bloqueado por 01 · desbloquea 06 · vertical dentro del dominio (de la entrada de la sonda al estado de salud; no hay capas de infraestructura ni de UI en este paso) · skills: `tdd`, `domain-modeling`, `codebase-design` · no sensible · estado: ready-for-agent (`02-health-classification.md`).

**02 · Implementar**

```text
Work on @.scratch/step-1-business-rules/issues/02-health-classification.md.
Attached: @.scratch/step-1-business-rules/spec.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @CLAUDE.md @docs/workflows/step-1/workflow.md
Read the ticket, the spec and the attached reference documents (the health classification rules, the probe rules, the per-project settings (path, expected status, timeout), the normalized probe error codes, the Step 1 "Done when" criteria), plus GLOSSARY.md and docs/adr/. Set the ticket's Status to in-progress.
Build: `HealthStatus` (`up | degraded | down`); `ProbeOutcome` as a discriminated union (a response with the final status code and a latency, or a failure with a probe error code, so that a status code together with an error code, or neither, cannot be represented); the health classification: given a probe outcome, the project's expected-status value and the latency threshold (a parameter with a named default of 2000 ms), return `up`, `degraded` or `down`; plus parsing the expected-status definition (single codes, ranges and lists such as `200-399,401`, codes from 100 to 599, whitespace tolerated) into a validated value, failing with the closed code `invalid_expected_status`, which lives next to the parser and not in the persisted code lists.
Not in this ticket: the HTTP probe, URL validation, redirects, Zod parsing, database CHECK constraints, reading thresholds from the environment, a Clock, persistence. Nothing from Steps 2-7.
Follow the tdd skill, using the skills listed in the ticket's "Skills to use" line. Propose the seams for this ticket (each with the risk it guards and what will not be tested) and wait for my confirmation before writing any test, then work one red test, minimal green, repeat. Seams to propose and confirm:
- Seam S1 health classification function; guards a named risk: a false green or a false red: 404 shown as up, a 500 shown as up, an expected 401 shown as degraded, a slow 200 shown as up, a timeout not shown as down, or the 2000 ms boundary off by one. Will not test: how the probe measures latency, how the response is fetched, any HTTP or network behavior.
- Seam S2 expected-status parser; guards a named risk: a malformed or hostile definition (inverted range, non-numeric, out-of-range code, empty segment, empty list) silently widening what counts as normal instead of failing closed with a closed error code. Will not test: the database CHECK on the same field and the form of the stored default (both belong to Step 3).
Cases to propose, one per distinct rule or boundary: fast 200 is up; slow 200 is degraded, with 2000 ms still up and 2001 ms degraded; 404 is degraded; 401 is up only when the project's expected list includes it; 499 is degraded and 500 is down; a failure with `timeout` is down and one other failure code is down; a slow response with a 5xx is down (down wins). A 5xx inside the expected list still parses and still classifies as `down`; the parser accepts 100 to 599 and gives a 1xx no special meaning (both settled in Phase A: do not reopen them).
Follow the existing code conventions: arrow functions only (no `function` declarations, no classes), `readonly` interface fields, no optional properties (use an explicit `T | null`; exactOptionalPropertyTypes stays off), never index an object or array with a variable (use an exhaustive `switch` with no `default` over closed internal unions, a `default` only where the input is an untrusted string and tests reach it, or a `Map`), expected failures returned as `Result<T, E>` with a closed union of error codes, JSDoc in English on exported units, no citation of project documents in comments or test titles, imports ordered external, then `@/`, then relative. Time enters as an argument (`now: Date` or already-built dates); never `Date.now()` or `new Date()` without arguments in domain code. No coverage-ignore comments and no lint-disable comments: if a branch cannot be reached, change the design, not the check.
Test quality rules, for every test you write:
- Each test guards a named risk: something a user, an attacker or a later change could break. If you cannot name the risk, do not write the test.
- Test behavior through the public interface (run the tool, call the function, lint a fixture). Do not assert that a config file contains a given line, that a file exists or what format it has, unless that file is itself the security barrier (for example the hash of a vendored binary).
- A test that can only fail when someone edits the file under test on purpose is a mirror of the configuration: do not write it.
- One case per distinct rule or boundary. Use a table only when each row can fail independently; do not multiply rows over data (every token, every path) when one representative plus the boundary cases catch the same defect.
- Guard-rail tests (lint rules, thresholds, resets, hooks) get a mutation check: break the guarded thing, see the test fail, restore it.
- Expected values come from an independent source, never recomputed the way the code does.
- Before stopping, list the tests added, each with the risk it guards and the count; delete the ones without a named risk.
Dependencies: none expected; if you think one is needed, stop and ask.
External actions: none. This ticket touches no system outside the repository.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
Stop when the acceptance criteria pass. Do not refactor yet.
```

**02 · Refactor**

```text
Attached: @.scratch/step-1-business-rules/issues/02-health-classification.md @.scratch/step-1-business-rules/spec.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @CLAUDE.md
Ticket 02 (Health classification) is green. Do a refactor pass limited to the files this ticket touched: `src/domain/health` (types, classification, expected-status parser and their tests).
Use the codebase-design vocabulary (module, interface, depth, seam, locality). Look for: the outcome type being a discriminated union that makes an invalid state (no status code and no error code) unrepresentable, duplicated range logic between parser and matcher, naming against GLOSSARY.md.
Keep every test green, change no behavior, add no features, and add no tests. Do not touch other layers.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
Show me a summary of the diff before moving on.
```

**02 · Si algo falla**

```text
Attached: @.scratch/step-1-business-rules/issues/02-health-classification.md @.scratch/step-1-business-rules/spec.md @CLAUDE.md
Something failed unexpectedly while working on ticket 02 (Health classification): <paste the failing output, redacting secrets>.
Commands this ticket runs: `pnpm run test`, `pnpm run test:coverage`, `pnpm run lint`, `pnpm run typecheck`.
Likely areas: off-by-one at the 2000 ms boundary and at 499/500; `split` results under `noUncheckedIndexedAccess`; a defensive branch that cannot be reached and drops branch coverage below 100%; whitespace or empty segments in the expected-status string.
Use the diagnosing-bugs skill: build a reproducible red signal first, find the root cause, and do not patch the symptom. Do not lower a threshold, loosen an assertion, add a lint-disable or coverage-ignore comment, or weaken a check to make it pass.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
```

**02 · Revisar**

```text
/code-review <BASELINE_SHA>
Attached: @.scratch/step-1-business-rules/spec.md @.scratch/step-1-business-rules/issues/02-health-classification.md @CLAUDE.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md
Spec: .scratch/step-1-business-rules/spec.md, ticket 02 (Health classification).
Standards: CLAUDE.md and the attached reference documents (conventions, the domain rules and the architecture layers). Pay particular attention to: no way to reach `up` from a failure outcome; the parser fails closed; the thresholds are parameters with named defaults rather than hidden literals; the outcome type has no representable invalid state; each Step 1 case of this ticket (fast, slow, not found, expected restricted access, server error, timeout) has a test; test audit for repeated rows.
Also audit the tests added by this ticket: for each one, state the risk it guards. Report as findings the tests that only mirror a configuration file, repeat another test, multiply rows over data, or cannot fail for any reason other than a deliberate edit, and propose deleting or merging them (do not delete anything). Give the count of tests added.
For findings outside the scope of this ticket, propose new tickets in .scratch/step-1-business-rules/issues/ instead of fixing them here.
```

`/security-check`: no sensible. Este ticket no toca secretos, red, autenticación ni entrada externa; el riesgo de integridad (falso verde) se cubre en la revisión de código.

**02 · Cerrar y traspasar**

Pasa el ticket a `Status: done`, marca los criterios y anota en `## Comments` los tests añadidos con el riesgo que protege cada uno y su número. Haz el commit del ticket (lo confirmas tú) para que el siguiente tenga punto fijo. Si cortas a medias o al terminar:

```text
/handoff Attached: @.scratch/step-1-business-rules/issues/02-health-classification.md @.scratch/step-1-business-rules/issues/03-severity-and-closed-signal-types.md @.scratch/step-1-business-rules/spec.md @docs/workflows/step-1/workflow.md
Next session: implement ticket 03 of Step 1 (Severity ordering and closed signal types), because it closes the last "Done when" case (unknown severity) and gates the project verdict. Include the seams already agreed for ticket 02, the decisions of Phase A that ticket 03 depends on, and the open questions. Suggest the skills to load: tdd, domain-modeling, security-check.
```

---

### Ticket 03. Severity ordering and closed signal types

Bloqueado por 01 · desbloquea 06 · vertical dentro del dominio (de un texto no confiable a una gravedad que nunca se oculta) · skills: `tdd`, `domain-modeling`, `security-check` · **sensible** (integridad: rutas que fallan abiertas) · estado: ready-for-agent (`03-severity-and-closed-signal-types.md`).

**03 · Implementar**

```text
Work on @.scratch/step-1-business-rules/issues/03-severity-and-closed-signal-types.md.
Attached: @.scratch/step-1-business-rules/spec.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @CLAUDE.md @docs/workflows/step-1/workflow.md
Read the ticket, the spec and the attached reference documents (the severity rules (unknown severity treated as high), the normalized deployment states, the vulnerability sync states, the Step 1 "Done when" criteria), plus GLOSSARY.md and docs/adr/. Set the ticket's Status to in-progress.
Build: the closed severity type (`low < medium < high < critical`) with one definition of the order shared by comparison and threshold checks; an exact fail-safe conversion from an arbitrary string (only the four lowercase names are known; anything else, including different capitalization, the empty string and inherited property names, becomes `high`, with no trim or lowercase, done with a `switch`); and the two closed status types the verdict consumes, with no logic: `DeploymentStatus` (`building`, `ready`, `failed`, `unknown`) and `VulnerabilitySyncStatus` (`ok`, `not_enabled`, `no_access`, `error`). The domain does not normalize deployment strings (settled in Phase A): that belongs to the adapters.
Not in this ticket: mapping GitHub, Vercel or Render values (Step 3), Zod, the `auto_dismissed` mapping, UI labels, icons or weights, vulnerability persistence, deciding which alert states count as open (callers do). Nothing from Steps 2-7.
Follow the tdd skill, using the skills listed in the ticket's "Skills to use" line. Propose the seams for this ticket (each with the risk it guards and what will not be tested) and wait for my confirmation before writing any test, then work one red test, minimal green, repeat. Seams to propose and confirm:
- Seam S1 severity conversion and ordering, seam 3 of the spec; guards a named risk: an unknown, empty, differently cased or inherited-property value (such as `constructor`) hidden or ranked below known severities, so a serious alert is not surfaced; or `high` ranked below `medium`. Will not test: provider payload parsing and the stored column values.
- No seam for the two status types: they are closed types with no logic and the typecheck covers them.
Cases to propose: the order; the four known names convert to themselves; `'HIGH'`, the empty string, an unknown word, `constructor`, `__proto__` and `toString` become `high`.
Include the lookup-by-key pitfall in the seam notes: an object-literal lookup returns inherited properties for keys such as `constructor`; the project rules forbid indexing with a variable, so use an exhaustive `switch` or a `Map`.
Follow the existing code conventions: arrow functions only (no `function` declarations, no classes), `readonly` interface fields, no optional properties (use an explicit `T | null`; exactOptionalPropertyTypes stays off), never index an object or array with a variable (use an exhaustive `switch` with no `default` over closed internal unions, a `default` only where the input is an untrusted string and tests reach it, or a `Map`), expected failures returned as `Result<T, E>` with a closed union of error codes, JSDoc in English on exported units, no citation of project documents in comments or test titles, imports ordered external, then `@/`, then relative. Time enters as an argument (`now: Date` or already-built dates); never `Date.now()` or `new Date()` without arguments in domain code. No coverage-ignore comments and no lint-disable comments: if a branch cannot be reached, change the design, not the check.
Test quality rules, for every test you write:
- Each test guards a named risk: something a user, an attacker or a later change could break. If you cannot name the risk, do not write the test.
- Test behavior through the public interface (run the tool, call the function, lint a fixture). Do not assert that a config file contains a given line, that a file exists or what format it has, unless that file is itself the security barrier (for example the hash of a vendored binary).
- A test that can only fail when someone edits the file under test on purpose is a mirror of the configuration: do not write it.
- One case per distinct rule or boundary. Use a table only when each row can fail independently; do not multiply rows over data (every token, every path) when one representative plus the boundary cases catch the same defect.
- Guard-rail tests (lint rules, thresholds, resets, hooks) get a mutation check: break the guarded thing, see the test fail, restore it.
- Expected values come from an independent source, never recomputed the way the code does.
- Before stopping, list the tests added, each with the risk it guards and the count; delete the ones without a named risk.
Dependencies: none expected; if you think one is needed, stop and ask.
External actions: none. This ticket touches no system outside the repository.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
Stop when the acceptance criteria pass. Do not refactor yet.
```

**03 · Refactor**

```text
Attached: @.scratch/step-1-business-rules/issues/03-severity-and-closed-signal-types.md @.scratch/step-1-business-rules/spec.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @CLAUDE.md
Ticket 03 (Severity ordering and closed signal types) is green. Do a refactor pass limited to the files this ticket touched: `src/domain/vulnerability` and `src/domain/deployment` (types, conversion, ordering and their tests).
Use the codebase-design vocabulary (module, interface, depth, seam, locality). Look for: one ordering definition shared by comparison and threshold checks (no second copy of the order), a conversion with a single fail-safe exit, naming against GLOSSARY.md.
Keep every test green, change no behavior, add no features, and add no tests. Do not touch other layers.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
Show me a summary of the diff before moving on.
```

**03 · Si algo falla**

```text
Attached: @.scratch/step-1-business-rules/issues/03-severity-and-closed-signal-types.md @.scratch/step-1-business-rules/spec.md @CLAUDE.md
Something failed unexpectedly while working on ticket 03 (Severity ordering and closed signal types): <paste the failing output, redacting secrets>.
Commands this ticket runs: `pnpm run test`, `pnpm run test:coverage`, `pnpm run lint`, `pnpm run typecheck`.
Likely areas: `security/detect-object-injection` on a lookup written with a variable key; the exhaustive `default` branch counting as uncovered at 100% branches; case handling of the incoming string.
Use the diagnosing-bugs skill: build a reproducible red signal first, find the root cause, and do not patch the symptom. Do not lower a threshold, loosen an assertion, add a lint-disable or coverage-ignore comment, or weaken a check to make it pass.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
```

**03 · Revisar**

```text
/code-review <BASELINE_SHA>
Attached: @.scratch/step-1-business-rules/spec.md @.scratch/step-1-business-rules/issues/03-severity-and-closed-signal-types.md @CLAUDE.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md
Spec: .scratch/step-1-business-rules/spec.md, ticket 03 (Severity ordering and closed signal types).
Standards: CLAUDE.md and the attached reference documents (conventions, the domain rules and the architecture layers). Pay particular attention to: every path of an unrecognized severity input ends in `high`, never in a lower value; one single ordering; no lookup that can return inherited properties; the test audit finds no table that repeats rows over data.
Also audit the tests added by this ticket: for each one, state the risk it guards. Report as findings the tests that only mirror a configuration file, repeat another test, multiply rows over data, or cannot fail for any reason other than a deliberate edit, and propose deleting or merging them (do not delete anything). Give the count of tests added.
For findings outside the scope of this ticket, propose new tickets in .scratch/step-1-business-rules/issues/ instead of fixing them here.
```

```text
/security-check
Attached: @.scratch/step-1-business-rules/issues/03-severity-and-closed-signal-types.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @CLAUDE.md
Review the changes of ticket 03 (Severity ordering and closed signal types) against OWASP Top 10 and the security-by-design section of the attached reference documents. Focus on fail-open paths in the severity conversion: unknown, empty, `null`-like and differently cased inputs, inherited property names (`constructor`, `__proto__`, `toString`), and any ordering that can rank an unrecognized value below a known one. Report only; do not modify files.
```

**03 · Cerrar y traspasar**

Pasa el ticket a `Status: done`, marca los criterios y anota en `## Comments` los tests añadidos con el riesgo que protege cada uno y su número. Haz el commit del ticket (lo confirmas tú) para que el siguiente tenga punto fijo. Si cortas a medias o al terminar:

```text
/handoff Attached: @.scratch/step-1-business-rules/issues/03-severity-and-closed-signal-types.md @.scratch/step-1-business-rules/issues/04-data-staleness.md @.scratch/step-1-business-rules/spec.md @docs/workflows/step-1/workflow.md
Next session: implement ticket 04 of Step 1 (Data staleness), because it only needs ticket 01 and the verdict needs it. Include the seams already agreed for ticket 03, the decisions of Phase A that ticket 04 depends on, and the open questions. Suggest the skills to load: tdd, domain-modeling.
```

---

### Ticket 04. Data staleness

Bloqueado por 01 · desbloquea 06 · vertical dentro del dominio (de una marca de tiempo y la hora actual a «obsoleto sí/no») · skills: `tdd`, `domain-modeling` · no sensible · estado: ready-for-agent (`04-data-staleness.md`).

**04 · Implementar**

```text
Work on @.scratch/step-1-business-rules/issues/04-data-staleness.md.
Attached: @.scratch/step-1-business-rules/spec.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @CLAUDE.md @docs/workflows/step-1/workflow.md
Read the ticket, the spec and the attached reference documents (the stale-data rule and its initial values, the job frequencies, the honesty principle (no data never means safe)), plus GLOSSARY.md and docs/adr/. Set the ticket's Status to in-progress.
Build: the staleness rule: data is stale when its age exceeds three times the expected frequency of the job that produces it, a missing observation is stale, and the multiplier (named default 3) and the frequency are parameters; named exported defaults exist for the three frequencies: health check (5 minutes), deployment sync (15 minutes), vulnerability sync (daily). Age is measured from when the data was last observed (check or sync time), never from when the thing it describes happened.
Not in this ticket: the scheduler, a Clock port (Step 2), deciding which signals a use case reads, UI wording and styling. Nothing from Steps 2-7.
Follow the tdd skill, using the skills listed in the ticket's "Skills to use" line. Propose the seams for this ticket (each with the risk it guards and what will not be tested) and wait for my confirmation before writing any test, then work one red test, minimal green, repeat. Seams to propose and confirm:
- Seam S1 staleness function; guards a named risk: stale data shown as fresh (and so possibly green): an off-by-one at exactly three times the frequency, a missing observation treated as fresh, a future or invalid date treated as fresh. Will not test: the actual intervals chosen by composition and how often the jobs run.
Cases to propose: exactly at the threshold is not stale and one millisecond past it is stale; no observation is stale; a date later than `now` is stale (settled in Phase A: it fails closed); an invalid `Date` is stale; the threshold scales with the frequency given. Do not test the default constants on their own.
Follow the existing code conventions: arrow functions only (no `function` declarations, no classes), `readonly` interface fields, no optional properties (use an explicit `T | null`; exactOptionalPropertyTypes stays off), never index an object or array with a variable (use an exhaustive `switch` with no `default` over closed internal unions, a `default` only where the input is an untrusted string and tests reach it, or a `Map`), expected failures returned as `Result<T, E>` with a closed union of error codes, JSDoc in English on exported units, no citation of project documents in comments or test titles, imports ordered external, then `@/`, then relative. Time enters as an argument (`now: Date` or already-built dates); never `Date.now()` or `new Date()` without arguments in domain code. No coverage-ignore comments and no lint-disable comments: if a branch cannot be reached, change the design, not the check.
Test quality rules, for every test you write:
- Each test guards a named risk: something a user, an attacker or a later change could break. If you cannot name the risk, do not write the test.
- Test behavior through the public interface (run the tool, call the function, lint a fixture). Do not assert that a config file contains a given line, that a file exists or what format it has, unless that file is itself the security barrier (for example the hash of a vendored binary).
- A test that can only fail when someone edits the file under test on purpose is a mirror of the configuration: do not write it.
- One case per distinct rule or boundary. Use a table only when each row can fail independently; do not multiply rows over data (every token, every path) when one representative plus the boundary cases catch the same defect.
- Guard-rail tests (lint rules, thresholds, resets, hooks) get a mutation check: break the guarded thing, see the test fail, restore it.
- Expected values come from an independent source, never recomputed the way the code does.
- Before stopping, list the tests added, each with the risk it guards and the count; delete the ones without a named risk.
Dependencies: none expected; if you think one is needed, stop and ask.
External actions: none. This ticket touches no system outside the repository.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
Stop when the acceptance criteria pass. Do not refactor yet.
```

**04 · Refactor**

```text
Attached: @.scratch/step-1-business-rules/issues/04-data-staleness.md @.scratch/step-1-business-rules/spec.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @CLAUDE.md
Ticket 04 (Data staleness) is green. Do a refactor pass limited to the files this ticket touched: the staleness files under `src/domain` and their test.
Use the codebase-design vocabulary (module, interface, depth, seam, locality). Look for: a parameter object instead of loose arguments that always travel together, naming against GLOSSARY.md, one place for the default multiplier.
Keep every test green, change no behavior, add no features, and add no tests. Do not touch other layers.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
Show me a summary of the diff before moving on.
```

**04 · Si algo falla**

```text
Attached: @.scratch/step-1-business-rules/issues/04-data-staleness.md @.scratch/step-1-business-rules/spec.md @CLAUDE.md
Something failed unexpectedly while working on ticket 04 (Data staleness): <paste the failing output, redacting secrets>.
Commands this ticket runs: `pnpm run test`, `pnpm run test:coverage`, `pnpm run lint`, `pnpm run typecheck`.
Likely areas: `Date` comparison with an invalid date (`NaN` compares false both ways); using `new Date()` without arguments (lint error); timezone-dependent fixtures.
Use the diagnosing-bugs skill: build a reproducible red signal first, find the root cause, and do not patch the symptom. Do not lower a threshold, loosen an assertion, add a lint-disable or coverage-ignore comment, or weaken a check to make it pass.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
```

**04 · Revisar**

```text
/code-review <BASELINE_SHA>
Attached: @.scratch/step-1-business-rules/spec.md @.scratch/step-1-business-rules/issues/04-data-staleness.md @CLAUDE.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md
Spec: .scratch/step-1-business-rules/spec.md, ticket 04 (Data staleness).
Standards: CLAUDE.md and the attached reference documents (conventions, the domain rules and the architecture layers). Pay particular attention to: every comparison involving an invalid or missing date resolves to stale, never to fresh; age is computed from the observation time; no hidden clock; boundaries match the rule (exactly three times is not stale).
Also audit the tests added by this ticket: for each one, state the risk it guards. Report as findings the tests that only mirror a configuration file, repeat another test, multiply rows over data, or cannot fail for any reason other than a deliberate edit, and propose deleting or merging them (do not delete anything). Give the count of tests added.
For findings outside the scope of this ticket, propose new tickets in .scratch/step-1-business-rules/issues/ instead of fixing them here.
```

`/security-check`: no sensible. Este ticket no toca secretos, red, autenticación ni entrada externa; el riesgo de integridad (falso verde) se cubre en la revisión de código.

**04 · Cerrar y traspasar**

Pasa el ticket a `Status: done`, marca los criterios y anota en `## Comments` los tests añadidos con el riesgo que protege cada uno y su número. Haz el commit del ticket (lo confirmas tú) para que el siguiente tenga punto fijo. Si cortas a medias o al terminar:

```text
/handoff Attached: @.scratch/step-1-business-rules/issues/04-data-staleness.md @.scratch/step-1-business-rules/issues/05-uptime-availability.md @.scratch/step-1-business-rules/spec.md @docs/workflows/step-1/workflow.md
Next session: implement ticket 05 of Step 1 (Uptime availability), because it only needs ticket 01: it takes already-windowed counts, not `HealthStatus`. Include the seams already agreed for ticket 04, the decisions of Phase A that ticket 05 depends on, and the open questions. Suggest the skills to load: tdd, domain-modeling.
```

---

### Ticket 05. Uptime availability

Bloqueado por 01 · desbloquea ninguno dentro del paso (lo consume el Paso 2) · vertical dentro del dominio (de los conteos de checks a disponibilidad o «sin datos») · skills: `tdd`, `domain-modeling` · no sensible · estado: ready-for-agent (`05-uptime-availability.md`).

**05 · Implementar**

```text
Work on @.scratch/step-1-business-rules/issues/05-uptime-availability.md.
Attached: @.scratch/step-1-business-rules/spec.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @CLAUDE.md @docs/workflows/step-1/workflow.md
Read the ticket, the spec and the attached reference documents (the uptime rule and its minimum-data threshold, the history retention and the 24 h / 7 d windows, the honesty principle), plus GLOSSARY.md and docs/adr/. Set the ticket's Status to in-progress.
Build: the availability rule. Input: counts already restricted to the window (`up`, `degraded`, `down`, the rule's own type, not `HealthStatus`), the window and the expected frequency in milliseconds. Expected checks are the window divided by the frequency, with no rounding; there is data only when the total is at least a named-default share (50 %) of the expected checks, compared without rounding. Result: `{ kind: 'no_data' }` or `{ kind: 'available', ratio }`, with the ratio between 0 and 1 equal to (`up` plus `degraded`) over the total. A zero total, or a non-positive window or frequency, is `no_data`. Counting checks inside a window is a query concern for Steps 2 and 3.
Not in this ticket: querying checks by window, rounding or formatting a percentage, retention and purge, the use cases that call it. Nothing from Steps 2-7.
Follow the tdd skill, using the skills listed in the ticket's "Skills to use" line. Propose the seams for this ticket (each with the risk it guards and what will not be tested) and wait for my confirmation before writing any test, then work one red test, minimal green, repeat. Seams to propose and confirm:
- Seam S1 availability function, seam 6 of the spec; guards a named risk: a misleading percentage: a number shown with too few checks, `degraded` not counted as available or `down` counted as available, an empty window, or a non-positive window or frequency, producing `NaN` or a number, more checks than expected (overlapping runs) giving more than 100%. Will not test: how checks are selected for a window and how the number is displayed.
Cases to propose: exactly half of the expected checks is data and one check fewer is "no data"; zero checks is "no data"; a non-positive window or frequency is "no data"; `degraded` counts as available and `down` does not; all checks `down` with enough data gives a ratio of 0, not "no data"; more checks than expected still gives a ratio based on the real total; one 7-day case showing the expected count scales with the window. Expected values come from worked examples written by hand in the test, not from the formula.
Follow the existing code conventions: arrow functions only (no `function` declarations, no classes), `readonly` interface fields, no optional properties (use an explicit `T | null`; exactOptionalPropertyTypes stays off), never index an object or array with a variable (use an exhaustive `switch` with no `default` over closed internal unions, a `default` only where the input is an untrusted string and tests reach it, or a `Map`), expected failures returned as `Result<T, E>` with a closed union of error codes, JSDoc in English on exported units, no citation of project documents in comments or test titles, imports ordered external, then `@/`, then relative. Time enters as an argument (`now: Date` or already-built dates); never `Date.now()` or `new Date()` without arguments in domain code. No coverage-ignore comments and no lint-disable comments: if a branch cannot be reached, change the design, not the check.
Test quality rules, for every test you write:
- Each test guards a named risk: something a user, an attacker or a later change could break. If you cannot name the risk, do not write the test.
- Test behavior through the public interface (run the tool, call the function, lint a fixture). Do not assert that a config file contains a given line, that a file exists or what format it has, unless that file is itself the security barrier (for example the hash of a vendored binary).
- A test that can only fail when someone edits the file under test on purpose is a mirror of the configuration: do not write it.
- One case per distinct rule or boundary. Use a table only when each row can fail independently; do not multiply rows over data (every token, every path) when one representative plus the boundary cases catch the same defect.
- Guard-rail tests (lint rules, thresholds, resets, hooks) get a mutation check: break the guarded thing, see the test fail, restore it.
- Expected values come from an independent source, never recomputed the way the code does.
- Before stopping, list the tests added, each with the risk it guards and the count; delete the ones without a named risk.
Dependencies: none expected; if you think one is needed, stop and ask.
External actions: none. This ticket touches no system outside the repository.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
Stop when the acceptance criteria pass. Do not refactor yet.
```

**05 · Refactor**

```text
Attached: @.scratch/step-1-business-rules/issues/05-uptime-availability.md @.scratch/step-1-business-rules/spec.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @CLAUDE.md
Ticket 05 (Uptime availability) is green. Do a refactor pass limited to the files this ticket touched: the availability files under `src/domain/health` and their test.
Use the codebase-design vocabulary (module, interface, depth, seam, locality). Look for: the result type being a discriminated union (`no data` or `available` with a ratio) instead of a nullable number, one definition of "expected checks", naming against GLOSSARY.md.
Keep every test green, change no behavior, add no features, and add no tests. Do not touch other layers.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
Show me a summary of the diff before moving on.
```

**05 · Si algo falla**

```text
Attached: @.scratch/step-1-business-rules/issues/05-uptime-availability.md @.scratch/step-1-business-rules/spec.md @CLAUDE.md
Something failed unexpectedly while working on ticket 05 (Uptime availability): <paste the failing output, redacting secrets>.
Commands this ticket runs: `pnpm run test`, `pnpm run test:coverage`, `pnpm run lint`, `pnpm run typecheck`.
Likely areas: a rounding step creeping into the minimum expected count and moving the boundary by one (the rule compares without rounding); floating-point comparisons at exactly half; division by zero when the frequency or window is zero.
Use the diagnosing-bugs skill: build a reproducible red signal first, find the root cause, and do not patch the symptom. Do not lower a threshold, loosen an assertion, add a lint-disable or coverage-ignore comment, or weaken a check to make it pass.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
```

**05 · Revisar**

```text
/code-review <BASELINE_SHA>
Attached: @.scratch/step-1-business-rules/spec.md @.scratch/step-1-business-rules/issues/05-uptime-availability.md @CLAUDE.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md
Spec: .scratch/step-1-business-rules/spec.md, ticket 05 (Uptime availability).
Standards: CLAUDE.md and the attached reference documents (conventions, the domain rules and the architecture layers). Pay particular attention to: no path returns a percentage below the minimum-data threshold; the boundary is the one in the rule (less than half is no data); invalid inputs (a non-positive window or frequency) fail closed; worked-example expectations rather than recomputation.
Also audit the tests added by this ticket: for each one, state the risk it guards. Report as findings the tests that only mirror a configuration file, repeat another test, multiply rows over data, or cannot fail for any reason other than a deliberate edit, and propose deleting or merging them (do not delete anything). Give the count of tests added.
For findings outside the scope of this ticket, propose new tickets in .scratch/step-1-business-rules/issues/ instead of fixing them here.
```

`/security-check`: no sensible. Este ticket no toca secretos, red, autenticación ni entrada externa; el riesgo de integridad (falso verde) se cubre en la revisión de código.

**05 · Cerrar y traspasar**

Pasa el ticket a `Status: done`, marca los criterios y anota en `## Comments` los tests añadidos con el riesgo que protege cada uno y su número. Haz el commit del ticket (lo confirmas tú) para que el siguiente tenga punto fijo. Si cortas a medias o al terminar:

```text
/handoff Attached: @.scratch/step-1-business-rules/issues/05-uptime-availability.md @.scratch/step-1-business-rules/issues/06-project-status-verdict.md @.scratch/step-1-business-rules/spec.md @docs/workflows/step-1/workflow.md
Next session: implement ticket 06 of Step 1 (Project status verdict), because it composes the rules of tickets 02, 03 and 04, which are all done at this point. Include the seams already agreed for ticket 05, the decisions of Phase A that ticket 06 depends on, and the open questions. Suggest the skills to load: tdd, domain-modeling, codebase-design, security-check.
```

---

### Ticket 06. Project status verdict

Bloqueado por 02, 03, 04 · desbloquea la Fase G · vertical dentro del dominio (de las señales de un proyecto al veredicto de la tarjeta) · skills: `tdd`, `domain-modeling`, `codebase-design`, `security-check` · **sensible** (integridad: rutas que fallan abiertas) · estado: ready-for-agent (`06-project-status-verdict.md`).

**06 · Implementar**

```text
Work on @.scratch/step-1-business-rules/issues/06-project-status-verdict.md.
Attached: @.scratch/step-1-business-rules/spec.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @CLAUDE.md @docs/workflows/step-1/workflow.md
Read the ticket, the spec and the attached reference documents (the project traffic-light rules, the stale-data rule, the vulnerability sync states, the severity rules, the visual state vocabulary (verdict computed in the domain, the interface only paints it), the honesty principle), plus GLOSSARY.md and docs/adr/. Set the ticket's Status to in-progress.
Build: the project verdict that the dashboard card will show, computed entirely in the domain, with the values and reasons settled in Phase A (the ticket lists them): `down` (`probe_down`, `critical_vulnerability`), `degraded` (`probe_degraded`, `deployment_failed`, `high_vulnerability`), `no_recent_data` (only when nothing known is bad: missing, stale, unknown or not-ok signals, each with its own reason) and `operational` (every signal known, fresh and fine). Input: three signals, each `null` when there is no record (health `{ status, observedAt }`, deployment `{ status, observedAt }`, vulnerabilities `{ syncStatus, openSeverities, observedAt }`), plus `now` and optional thresholds; the verdict applies the staleness rule itself. The reasons list holds only the reasons of the winning level, all of them when several apply. Open alerts always count, whatever the state or age of the last sync; `building` and low or medium alerts do not change the verdict. Implement exactly what was decided. This is the largest ticket of the step: if the session runs short, stop at a green slice (down and degraded first, then no data and operational).
Not in this ticket: UI labels, colors and icons, reading data from storage, the use cases that assemble the input, availability. Nothing from Steps 2-7.
Follow the tdd skill, using the skills listed in the ticket's "Skills to use" line. Propose the seams for this ticket (each with the risk it guards and what will not be tested) and wait for my confirmation before writing any test, then work one red test, minimal green, repeat. Seams to propose and confirm:
- Seam S1 project verdict function, seam 7 of the spec; guards a named risk: a false green: a project that is down, has a critical or high open vulnerability, has stale, missing or unknown data, or an unreadable vulnerability sync shown as healthy; or a broken precedence (stale or missing data hiding a known down, degraded or open alert). Will not test: UI rendering, how the input is assembled from storage, the individual rules already covered by tickets 02, 03 and 04.
Cases to propose, one per rule and per precedence decision taken in Phase A: a `down` check gives `down` with `probe_down`; an open critical alert gives `down` with `critical_vulnerability`, and both together list both reasons; a `degraded` check, a `failed` deployment and an open high alert each give `degraded` with their own reason, and all three together list all three; operational only with every signal known, fresh and fine, and without reasons; no check, no deployment record, no sync, a deployment `unknown` and each non-ok sync state (`not_enabled`, `no_access`, `error`) each give `no_recent_data` with their own reason; a stale check, deployment and sync each give `no_recent_data` when nothing else is known bad; a known `down` or `degraded` wins over stale or missing signals and lists none of the lower-level reasons; open critical or high alerts count even with a failed, missing or stale sync; a `building` deployment and open low or medium alerts leave a healthy project `operational`. Use the real domain functions from earlier tickets, not fakes of them.
Follow the existing code conventions: arrow functions only (no `function` declarations, no classes), `readonly` interface fields, no optional properties (use an explicit `T | null`; exactOptionalPropertyTypes stays off), never index an object or array with a variable (use an exhaustive `switch` with no `default` over closed internal unions, a `default` only where the input is an untrusted string and tests reach it, or a `Map`), expected failures returned as `Result<T, E>` with a closed union of error codes, JSDoc in English on exported units, no citation of project documents in comments or test titles, imports ordered external, then `@/`, then relative. Time enters as an argument (`now: Date` or already-built dates); never `Date.now()` or `new Date()` without arguments in domain code. No coverage-ignore comments and no lint-disable comments: if a branch cannot be reached, change the design, not the check.
Test quality rules, for every test you write:
- Each test guards a named risk: something a user, an attacker or a later change could break. If you cannot name the risk, do not write the test.
- Test behavior through the public interface (run the tool, call the function, lint a fixture). Do not assert that a config file contains a given line, that a file exists or what format it has, unless that file is itself the security barrier (for example the hash of a vendored binary).
- A test that can only fail when someone edits the file under test on purpose is a mirror of the configuration: do not write it.
- One case per distinct rule or boundary. Use a table only when each row can fail independently; do not multiply rows over data (every token, every path) when one representative plus the boundary cases catch the same defect.
- Guard-rail tests (lint rules, thresholds, resets, hooks) get a mutation check: break the guarded thing, see the test fail, restore it.
- Expected values come from an independent source, never recomputed the way the code does.
- Before stopping, list the tests added, each with the risk it guards and the count; delete the ones without a named risk.
Dependencies: none expected; if you think one is needed, stop and ask.
External actions: none. This ticket touches no system outside the repository.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
Stop when the acceptance criteria pass. Do not refactor yet.
```

**06 · Refactor**

```text
Attached: @.scratch/step-1-business-rules/issues/06-project-status-verdict.md @.scratch/step-1-business-rules/spec.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @CLAUDE.md
Ticket 06 (Project status verdict) is green. Do a refactor pass limited to the files this ticket touched: `src/domain/project` (the verdict, its input type and tests).
Use the codebase-design vocabulary (module, interface, depth, seam, locality). Look for: the input type as one cohesive snapshot instead of loose arguments (data clumps), one ordered list of rules instead of nested conditionals, no second copy of severity or staleness logic.
Keep every test green, change no behavior, add no features, and add no tests. Do not touch other layers.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
Show me a summary of the diff before moving on.
```

**06 · Si algo falla**

```text
Attached: @.scratch/step-1-business-rules/issues/06-project-status-verdict.md @.scratch/step-1-business-rules/spec.md @CLAUDE.md
Something failed unexpectedly while working on ticket 06 (Project status verdict): <paste the failing output, redacting secrets>.
Commands this ticket runs: `pnpm run test`, `pnpm run test:coverage`, `pnpm run lint`, `pnpm run typecheck`.
Likely areas: branch coverage below 100% from a defensive default in an exhaustive `switch`; a precedence case contradicting the decision recorded in Phase A; fixtures building dates with `new Date()` without arguments.
Use the diagnosing-bugs skill: build a reproducible red signal first, find the root cause, and do not patch the symptom. Do not lower a threshold, loosen an assertion, add a lint-disable or coverage-ignore comment, or weaken a check to make it pass.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
```

**06 · Revisar**

```text
/code-review <BASELINE_SHA>
Attached: @.scratch/step-1-business-rules/spec.md @.scratch/step-1-business-rules/issues/06-project-status-verdict.md @CLAUDE.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md
Spec: .scratch/step-1-business-rules/spec.md, ticket 06 (Project status verdict).
Standards: CLAUDE.md and the attached reference documents (conventions, the domain rules and the architecture layers). Pay particular attention to: no path reaches `operational` with stale, missing or unknown input; open alerts count whatever the state or age of the last sync; precedence matches the Phase A decision exactly; the verdict reuses the severity and staleness functions instead of reimplementing them; the verdict values and reasons are the ones in the ticket and the glossary; test audit for repeated rows over data.
Also audit the tests added by this ticket: for each one, state the risk it guards. Report as findings the tests that only mirror a configuration file, repeat another test, multiply rows over data, or cannot fail for any reason other than a deliberate edit, and propose deleting or merging them (do not delete anything). Give the count of tests added.
For findings outside the scope of this ticket, propose new tickets in .scratch/step-1-business-rules/issues/ instead of fixing them here.
```

```text
/security-check
Attached: @.scratch/step-1-business-rules/issues/06-project-status-verdict.md @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @CLAUDE.md
Review the changes of ticket 06 (Project status verdict) against OWASP Top 10 and the security-by-design section of the attached reference documents. Focus on fail-open paths in the verdict: any combination of missing, stale, unknown or failed-sync input that still returns `operational`; precedence inversions; an open alert ignored because of the sync state; an input mutated by the function; a branch that returns `operational` by default. Report only; do not modify files.
```

**06 · Cerrar y traspasar**

Pasa el ticket a `Status: done`, marca los criterios y anota en `## Comments` los tests añadidos con el riesgo que protege cada uno y su número. Registra en `## Comments` la precedencia implementada, tal como se decidió en la Fase A. Haz el commit del ticket (lo confirmas tú) para que el siguiente tenga punto fijo. Si cortas a medias o al terminar:

```text
/handoff Attached: @.scratch/step-1-business-rules/issues/06-project-status-verdict.md @.scratch/step-1-business-rules/spec.md @docs/workflows/step-1/workflow.md
Next session: close Step 1 with the Phase G prompts of the workflow (verification of the "Done when" criteria, test audit and architecture review). Include the precedence recorded in ticket 06 and the list of tests added across the step. Suggest the skills to load: improve-codebase-architecture, codebase-design.
```

---

No hay ticket 07: la Fase A decidió no reconsiderar `exactOptionalPropertyTypes`. El dominio evita propiedades opcionales y usa `T | null` explícito; la opción se reabre cuando aparezca fricción real con librerías, en el Paso 2 o 3.

---

## Fase G. Cerrar el paso

Antes de ejecutarla, comprueba que todos los tickets del paso están en `Status: done` y que el árbol de trabajo está limpio.

```text
Attached: @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @.scratch/step-1-business-rules/spec.md @.scratch/step-1-business-rules/issues @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @CLAUDE.md @docs/workflows/step-1/workflow.md
Check each "Done when" criterion of Step 1 in the attached reference documents against the repository, and report each as met / not met with the command you ran and its result as evidence. Do not mark anything as met without running it.
The cases to evidence: fast response, slow response, not found, expected restricted access, server error, timeout and unknown severity, each with a test, and coverage above the threshold. Run `pnpm run test:coverage` and report the per-file figures for src/shared and src/domain; also run `pnpm run lint`, `pnpm run typecheck` and `pnpm run build`. Map each case to the test that covers it, by file and test name.
Check also that nothing outside the scope of Step 1 appeared in src/ (no use cases, ports, adapters, Zod, Clock, UI) and that the domain imports only shared and domain.
Test audit: report the number of tests per file and the total added by this step. For each test state the risk it guards; flag the ones that mirror configuration, duplicate another test, multiply rows over data or guard no named risk; propose which to delete or merge, without deleting anything.
Confirm that exactOptionalPropertyTypes is still off, as decided, and that no domain type uses an optional property.
List any deviation from the attached reference documents that we introduced. Deviations are decided by me; do not edit the reference documents.
Ask me before: installing or removing dependencies (list them with the reason), any commit, push or reset, deleting files, bypassing hooks (never use --no-verify) and any action on an external system. Strict TypeScript: no explicit `any`, no `@ts-ignore`.
```

```text
/improve-codebase-architecture
Attached: @docs/reference/SPEC.md @docs/reference/FUNCTIONALITIES.md @GLOSSARY.md @docs/adr/0002-no-recent-data-only-replaces-operational.md @CLAUDE.md
Focus on what Step 1 touched: src/shared and src/domain: module depth, the seams the future use cases will call, the exhaustive-switch pattern under 100% branch coverage, duplicated rules between modules, and whether the folder layout under src/domain matches the architecture section of the attached reference documents. Report only; I will pick which opportunity to pursue.
```

**Documentos a actualizar al cerrar:** `GLOSSARY.md` (términos resueltos y cualquier cambio de nombre), `docs/adr/` (solo si hay una decisión difícil de revertir, sorprendente y con compromiso real) y, si procede, una nota en los tickets. Las desviaciones respecto a los documentos de referencia las decides tú; no se editan sin tu aprobación. Después: volver a la Fase A del Paso 2 en sesión nueva.

## Puertas de confirmación y límites del paso

- **Antes de actuar (en todos los prompts):** instalar o quitar dependencias (ninguna prevista), cualquier commit, push o reset, borrar o sobrescribir ficheros, saltarse hooks (`--no-verify` no forma parte del flujo) y todo lo que toque sistemas externos (GitHub, despliegues, mensajes).
- **Escritura permitida:** el dominio y `shared` bajo `src/`, sus tests colocados junto al código, `GLOSSARY.md` y `docs/adr/` (Fase A) y los ficheros de `.scratch/step-1-business-rules/`.
- **Límites conocidos:** el dominio no se ejercita de extremo a extremo hasta el Paso 2; los valores por defecto (2000 ms, 3×, 50 %, 5 min, 15 min, diario) son valores iniciales de los documentos y pueden cambiar; la primera ejecución real de la CI es del Paso 0.
- **Si dos documentos se contradicen:** lo técnico lo decide la especificación técnica y lo visual `DESIGN.md`; cualquier contradicción se señala y decides tú.

## Chuleta

| Momento          | Comando                                                                  | Resultado                                   |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| Antes de empezar | Fase 0: `Status` del Paso 0, mirar la CI                                 | punto fijo `2ae73c3`                        |
| Decidir          | `/grill-with-docs`                                                       | decisiones, glosario, ADR 0002    |
| Escribir         | `/to-spec`                                                               | `.scratch/step-1-business-rules/spec.md`    |
| Trocear          | `/to-tickets`                                                            | `.scratch/step-1-business-rules/issues/01…` |
| Sincronizar      | prompt de la Fase C bis                                                  | workflow alineado con los tickets           |
| Cada ticket      | bloque «NN · Implementar»                                                | código y tests, sin refactor                |
| Tras el verde    | bloque «NN · Refactor»                                                   | pasada separada                             |
| Algo falla       | bloque «NN · Si algo falla»                                              | causa raíz                                  |
| Revisar          | bloque «NN · Revisar» (`/code-review`, más `/security-check` en 03 y 06) | informes y auditoría de tests               |
| Cerrar / cortar  | bloque «NN · Cerrar y traspasar» (`/handoff`)                            | commit y resumen en `$TMPDIR`               |
| Cerrar el paso   | Fase G + `/improve-codebase-architecture`                                | evidencias e informe                        |
