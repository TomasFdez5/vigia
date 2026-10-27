# Vigía: flujo de trabajo con las skills y el issue tracker

> Documento de trabajo (español). Explica cómo avanzar cada paso del plan de implementación usando las skills de `.claude/skills/` y el tracker local `.scratch/`.
> El ejemplo del Paso 0 es una **simulación ilustrativa**: no se ha ejecutado nada de lo que se describe en ella. Los nombres de ticket y los casos son una propuesta a revisar cuando se haga de verdad.
> Las skills se han leído (`to-spec`, `to-tickets`, `grill-with-docs`, `tdd`, `code-review`, `handoff`, `domain-modeling`), pero no probado.

## 1. Idea general

Cada paso del plan sigue el mismo ciclo, con una sesión de Claude Code limpia por fase:

```
grill-with-docs → to-spec → to-tickets → [tdd → code-review] × cada ticket → cierre del paso
   (decidir)      (escribir)  (trocear)      (construir y revisar)             (verificar)
```

## 1b. Documentos de referencia

Los documentos de referencia del producto (alcance, funcionalidades, especificación técnica) son la base de la idea del proyecto. **Ningún fichero del proyecto los cita ni enlaza** (ni `CLAUDE.md`, ni `DESIGN.md`, ni este documento por nombre o ruta), con una única excepción: el prompt generador de workflows por paso (`docs/workflow-generator-prompt.md`).

- **Cómo los usa el agente:** solo cuando tú los adjuntas con `@` en el prompt de la fase que los necesita (A, B, C, E y G). Si no se adjuntan, el agente no sabe que existen.
- **No se duplica** su contenido en los specs de `.scratch/`: el spec los referencia de forma genérica por sección, y tú sabes cuál es.
- **Cambios en ellos:** solo con tu aprobación explícita. Si una decisión los contradice, se señala y decides tú.

## 2. Qué es cada pieza

| Pieza | Qué hace | Se invoca | Escribe en |
|---|---|---|---|
| `grill-with-docs` | Entrevista exhaustiva sobre el plan. Carga `grilling` y `domain-modeling`. | `/grill-with-docs` | `GLOSSARY.md`, `docs/adr/` (de forma perezosa) |
| `to-spec` | Sintetiza la conversación en un spec. No entrevista. Pide confirmar los *seams* de prueba. | `/to-spec` | `.scratch/<feature>/spec.md` |
| `to-tickets` | Trocea en *tracer bullets* (cortes verticales) con dependencias. Pregunta por granularidad y bloqueos antes de publicar. | `/to-tickets` | `.scratch/<feature>/issues/NN-slug.md` |
| `tdd` | Reglas del ciclo rojo → verde. Exige acordar los *seams* antes de escribir ningún test. | se activa al implementar | código y tests |
| `code-review` | Revisa el diff desde un punto fijo en dos ejes (estándares y spec), con sub-agentes en paralelo. | `/code-review <ref>` | solo informe |
| `handoff` | Resume la sesión para que otra la continúe. | `/handoff <para qué>` | `$TMPDIR` (fuera del repo) |
| `improve-codebase-architecture` / `codebase-design` | Busca oportunidades de mejora de módulos y violaciones de capas. | al cerrar un paso | informe |

Las skills `to-spec`, `to-tickets`, `grill-me`, `grill-with-docs`, `handoff` e `improve-codebase-architecture` tienen `disable-model-invocation`: **hay que invocarlas tú explícitamente con `/nombre`**; Claude no las lanza solo. El resto se pueden activar solas según su descripción (ver §7).

Los prompts de cada fase van en bloques de código, listos para pegar. Ajusta el número de paso y de ticket.

## 3. Antes de empezar (una sola vez)

1. **`grilling` instalada.** `grill-me` y `grill-with-docs` la llaman internamente; sin ella fallarían.
2. **Hacer un primer commit con los documentos existentes**, porque `code-review` necesita un punto fijo de comparación. Los commits se hacen solo con tu confirmación.
3. **Decisión: `.scratch/` no se versiona.** Está en `.gitignore`. Consecuencia: specs y tickets no quedan en el historial de git ni se publican con el repo, y se pierden si se borra la carpeta; las decisiones duraderas deben pasar a `GLOSSARY.md`, ADR o `DESIGN.md` (que sí se versionan).
4. **Decisión: todo en inglés.** Specs, tickets, `GLOSSARY.md`, ADR, código, commits y UI. Este documento y los documentos de referencia siguen en español como documentos de trabajo. Al invocar las skills, pide que escriban en inglés.

## 4. Ciclo paso a paso (ejemplo: Paso 0)

### Fase A. Decidir: `/grill-with-docs`

Sesión nueva. Prompt:

```text
/grill-with-docs
We are planning Step 0 (project and repository setup) of the implementation order.
First read the reference documents attached to this message (relevant parts: access and session, credentials, application security, quality and contribution, Step 0, the phased plan, architecture, tooling and open decisions) and the Tailwind/CSP section of DESIGN.md.
Respect the scope limits stated in them (what the product does not do, functionality constraints, out of MVP).
Interview me one question at a time about whatever is still open or ambiguous for this step, and give your recommended answer to each.
Flag any contradiction between documents.
Write resolved terms to GLOSSARY.md (English, no implementation details). Propose an ADR only when the decision is hard to reverse, surprising without context and a real trade-off.
Do not write code or create project files.
```

Adjunta los documentos de referencia con `@` al enviar el prompt.

Qué cabe esperar:
- Preguntas de una en una sobre lo que no esté cerrado. Ejemplos reales de los documentos: tests pgTAP en CI sí/no, versión de Node LTS, qué va en `allowBuilds`, qué parte de `config.toml` entra ahora.
- Términos que pasan a `GLOSSARY.md` cuando se resuelven (por ejemplo *Project*, *Health check*, *Probe*, *Hosting provider*, *Verdict*, *Stale*). El glosario **no lleva detalles de implementación**.
- ADR solo si cumplen las tres condiciones de `domain-modeling`: difícil de revertir, sorprendente sin contexto y fruto de un compromiso real. Candidatos: secret key frente a rol Postgres restringido, scheduler externo.

Resultado: decisiones tomadas y escritas. Si algo contradice un documento de referencia, se señala y decides tú si se actualiza ese documento (no se deja solo en la conversación).

### Fase B. Escribir el spec: `/to-spec`

```text
/to-spec
Write the spec for Step 0 from what we just decided. Publish it to .scratch/step-0-setup/spec.md, in English.
Refer to the attached reference documents by section instead of copying them.
Keep the user stories short and limited to what Step 0 delivers (actors: maintainer, contributor).
Propose the test seams from the "Done when" criteria of Step 0 and wait for my confirmation before publishing.
For each seam state the risk it guards and what will NOT be tested (plain config values, file existence or format, framework wiring already covered by lint, typecheck or build).
Out of scope: anything from Steps 1-7.
```

- No te entrevista: sintetiza lo hablado. Antes de publicar **te pide confirmar los seams de prueba**.
- Seams propuestos para el Paso 0 (ilustrativos, a partir de los criterios «Hecho cuando» del paso):
  1. Un commit con un secreto de prueba es rechazado (hook local y CI).
  2. Un import prohibido entre capas hace fallar ESLint.
  3. Arrancar sin una variable de entorno obligatoria falla.
  4. La CI pasa en un proyecto vacío.
- Pedirle explícitamente que **referencie** los documentos de referencia por sección y no copie su contenido (adjúntalos con `@`). La plantilla exige historias de usuario muy extensas: para un paso de tooling, conviene pedirlas acotadas.
- Nota: la skill dice «aplica la etiqueta `ready-for-agent`». Como `triage` no está instalada, en el tracker local eso se traduce en la línea `Status:` del fichero.

**Punto de control (tuyo):** lee `spec.md`, corrige y aprueba antes de trocear.

### Fase C. Trocear: `/to-tickets`

```text
/to-tickets .scratch/step-0-setup/spec.md
Break the spec into tracer-bullet tickets, in English, in .scratch/step-0-setup/issues/.
Each ticket needs: what to build, blocked by, acceptance criteria taken from the spec's testing decisions, and a "Skills to use" line naming the project skills that apply (e.g. tdd, supabase, security-check).
Tooling tickets may be horizontal; say so when they are.
Show me the numbered breakdown and ask about granularity and blocking edges before writing any file.
Each ticket must fit in one fresh session.
```

La línea «Skills to use» no es parte de la plantilla de la skill: la añade este prompt para que luego el agente sepa qué skills cargar (ver §7).

La skill propone una lista numerada (título, *Blocked by*, qué entrega) y **te pregunta** por granularidad, bloqueos y si fusionar o dividir. Itera hasta que apruebes y entonces escribe un fichero por ticket, numerado en orden de dependencias.

Reparto ilustrativo para el Paso 0:

| # | Ticket | Bloqueado por | Se verifica con |
|---|---|---|---|
| 01 | Esqueleto Next.js + TS strict + Tailwind + Vitest con un test que pasa y scripts `lint`/`typecheck`/`test` | ninguno | los tres scripts pasan |
| 02 | Reglas ESLint de capas y de `process.env` | 01 | un fixture con import prohibido falla |
| 03 | Módulo de entorno con Zod y `server-only` | 01, 02 | arrancar sin variable falla |
| 04 | Hooks locales: husky, lint-staged, secretlint, commitlint, pre-push | 01 | un commit con secreto de prueba es rechazado |
| 05 | CI con las mismas comprobaciones, `pnpm audit` y secretlint sobre `.next/static` | 01, 03, 04 | CI verde en proyecto vacío |
| 06 | Configuración de Supabase (`config.toml` de auth) y CLI local | 01 | `enable_signup = false`, etc., aplicados |
| 07 | `.env.example`, `.gitignore` y lista de ajustes del repositorio (acciones externas, con tu confirmación) | 04 | `.env*` excluido, lista escrita |

Los tickets de tooling no son verticales «puros»; es aceptable en el Paso 0. Desde el Paso 1 deben cortar toda la pila afectada.

Cada ticket debería caber en una sesión limpia. Si no cabe, se divide.

### Fase D. Construir un ticket: `tdd`

Una **sesión nueva por ticket**, empezando por la *frontera* (tickets cuyos bloqueos están todos hechos; si la cadena es lineal, de arriba abajo).

Prompt de implementación:

```text
Work on .scratch/step-0-setup/issues/01-<slug>.md.
Read the ticket, the spec and the documents they reference, plus GLOSSARY.md and docs/adr/.
Set the ticket's Status to in-progress.
Follow the tdd skill: propose the seams for this ticket (with the risk each guards and what will not be tested) and wait for my confirmation, then work one red test → minimal green → repeat.
Test quality rules, for every test you write:
- Each test guards a named risk: something a user, an attacker or a later change could break. If you cannot name the risk, do not write the test.
- Test behavior through the public interface (run the tool, call the function, lint a fixture). Do not assert that a config file contains a given line, that a file exists or what format it has, unless that file is itself the security barrier (for example the hash of a vendored binary).
- A test that can only fail when someone edits the file under test on purpose is a mirror of the configuration: do not write it.
- One case per distinct rule or boundary. Use a table only when each row can fail independently; do not multiply rows over data (every token, every path) when one representative plus the boundary cases catch the same defect.
- Guard-rail tests (lint rules, thresholds, resets, hooks) get a mutation check: break the guarded thing, see the test fail, restore it.
- Expected values come from an independent source, never recomputed the way the code does.
- Before stopping, list the tests added, each with the risk it guards and the count; delete the ones without a named risk.
Use the skills listed in the ticket's "Skills to use" line, and Context7 for any library or framework documentation.
Ask before installing any dependency (list them with the reason) and before any commit.
Stop when the acceptance criteria pass. Do not refactor yet.
```

Detalle del ciclo:

1. Pasa a `Status: in-progress` el ticket y léelo junto con el spec.
2. **Acordar los seams antes de escribir el primer test.** Es regla de `tdd`: ningún test se escribe en un seam sin confirmar.
3. Ciclo: un test que falla → lo mínimo para que pase → repetir. Nada de escribir todos los tests de golpe. Los valores esperados vienen de una fuente independiente (el spec, un caso documentado), no de recalcular lo que hace el código.
4. Tus reglas de `CLAUDE.md` siguen vigentes: **confirmar cada instalación de dependencias** (en el Paso 0 son muchas: conviene aprobar la lista por ticket), cada commit y cada acción externa.
5. El refactor **no** forma parte del bucle de `tdd`; se hace como pasada aparte antes de la revisión, con este prompt:

```text
The ticket is green. Do a refactor pass limited to the files touched by this ticket.
Use the codebase-design vocabulary. Keep every test green, change no behavior, add no features.
Show me a summary of the diff before moving on.
```

**Calidad de los tests.** Que haya muchos tests no es calidad. El prompt de implementación lleva reglas para que cada test proteja un riesgo concreto y pruebe comportamiento, no que el fichero de configuración diga lo que dice. Un test que solo falla cuando editas el fichero a propósito es un espejo y sobra. En tickets de tooling, prefiere ejecutar la herramienta (un commit con secreto es rechazado, un import prohibido falla en ESLint) a leer y comparar su configuración. Las comprobaciones de guarda (reglas de lint, umbrales, resets) llevan una prueba de mutación: se rompe lo protegido y el test debe fallar.

Si un test falla de forma inesperada durante el ciclo, usa `diagnosing-bugs`:

```text
Something failed unexpectedly: <paste the failing output, redacting secrets>.
Use the diagnosing-bugs skill: build a reproducible red signal first, find the root cause, and do not patch the symptom.
```

### Fase E. Revisar: `/code-review`

```text
/code-review main
Spec: .scratch/step-0-setup/spec.md, ticket 01.
Standards: CLAUDE.md, DESIGN.md and the attached reference documents (conventions, security by design, and the restrictions of the functionalities touched).
Also audit the tests added by this ticket: for each one, the risk it guards. Report as findings the tests that only mirror a configuration file, repeat another test, or cannot fail for any reason other than a deliberate edit, and propose deleting or merging them.
For findings outside the scope of this ticket, propose new tickets in .scratch/step-0-setup/issues/ instead of fixing them here.
```

`main` es el punto fijo: sustitúyelo por el commit anterior al ticket si no hay rama. Para tickets sensibles, segunda pasada:

```text
/security-check
Review the changes of ticket 04 (git hooks and secret scanning) against OWASP Top 10 and the security-by-design section of the attached reference documents. Report only; do not modify files.
```

- Requiere un punto fijo que resuelva y un diff no vacío.
- Eje **Estándares**: contra los documentos del repo y la lista de *code smells*. Eje **Spec**: contra `.scratch/.../spec.md` (busca ahí por el nombre de la rama o feature).
- Entrega dos informes separados, sin mezclar. Los hallazgos que queden fuera del ticket **se convierten en tickets nuevos**, no amplían el actual.
- Para tickets sensibles (hooks, CI, RLS, cron, adaptadores) añade además `security-check`, que ya tienes instalada globalmente.

### Fase F. Cerrar el ticket y seguir

- `Status: done`, criterios marcados y notas en `## Comments`.
- Si cortas la sesión a medias, `/handoff`. El documento se guarda en `$TMPDIR`, **no** en el repo, y referencia el spec y los tickets en vez de copiarlos:

```text
/handoff Next session: implement ticket 03 of Step 0 (environment module). Include the seams already agreed and the open questions. Suggest the skills to load.
```

### Fase G. Cerrar el paso

1. Comprobar el criterio «Hecho cuando» del paso:

```text
Check each "Done when" criterion of Step 0 in the attached reference documents against the repository.
For each one, report met / not met with the command you ran and its result as evidence. Do not mark anything as met without running it.
List any deviation from the attached reference documents that we introduced.
Also report the number of tests per file and flag the ones that mirror configuration, duplicate another test or guard no named risk; propose which to delete or merge, without deleting anything.
```

2. Detectar acoplamientos antes del siguiente paso:

```text
/improve-codebase-architecture
Focus on layer boundaries (the dependency rule in the architecture section of the attached reference documents) and the composition root. Report only; I will pick which opportunity to pursue.
```

3. Actualizar `GLOSSARY.md`/ADR si algo cambió (documentos versionados, a diferencia de `.scratch/`). Las desviaciones respecto a los documentos de referencia las decides tú.
4. Siguiente paso: volver a la Fase A en sesión nueva.

## 5. Chuleta (comandos; los prompts completos están en §4)

| Momento | Comando | Resultado |
|---|---|---|
| Empiezo un paso | `/grill-with-docs` | decisiones + glosario/ADR |
| Decidido | `/to-spec` | `spec.md` |
| Spec aprobado | `/to-tickets <spec>` | `issues/NN-*.md` |
| Cada ticket | `tdd` (con seams acordados) | código y tests |
| Ticket terminado | `/code-review <ref>` | informe Estándares + Spec |
| Corto la sesión | `/handoff <foco>` | resumen en `$TMPDIR` |
| Cierro el paso | `improve-codebase-architecture` | informe |

## 6. Uso del resto de skills

**Respuesta corta:** el flujo de §4 invoca explícitamente solo algunas. Las demás dependen de que el agente las active por sí solo (posible, pero no garantizado) o de que las nombres tú. Lo que he comprobado: qué skills permiten activación automática y cuáles no. Lo que no he comprobado: con qué fiabilidad se activan en la práctica.

| Skill | Cómo se activa | Dónde la usa el flujo |
|---|---|---|
| `to-spec`, `to-tickets`, `grill-me`, `grill-with-docs`, `handoff`, `improve-codebase-architecture` | **Solo manual** (`/nombre`) | Fases A, B, C, F y G |
| `grilling`, `domain-modeling` | Las carga `grill-with-docs` | Fase A |
| `tdd` | Automática por descripción; el prompt de la Fase D la nombra | Fase D |
| `codebase-design` | La referencia `tdd` y el refactor | Fase D (refactor) |
| `code-review` | Automática, pero se lanza con `/code-review` | Fase E |
| `diagnosing-bugs` | Automática ante algo roto; también va en el prompt | Fase D (fallos) |
| `supabase`, `supabase-postgres-best-practices` | Automática (sus descripciones cubren Auth, RLS, migraciones) | **No están en ninguna fase.** Deben ir en «Skills to use» de los tickets de Supabase |
| `vercel-react-best-practices`, `vercel-composition-patterns` | Automática al escribir React/Next | **No están en ninguna fase.** Pasos 5 y siguientes |
| `frontend-design`, `web-design-guidelines` | Automática al construir o revisar UI | **No están en ninguna fase.** Paso 5 |
| `agent-browser` | Automática ante tareas de navegador | **No está en ninguna fase.** Paso 5, verificación de UI |

**Qué cambia en la práctica**
- El campo «Skills to use» de cada ticket (pedido en el prompt de la Fase C) es el mecanismo para que el agente cargue las skills de implementación. Sin él, dependes de la activación automática.
- Skills por paso (propuesta para rellenar ese campo):

| Paso | Skills de implementación |
|---|---|
| 0 | `supabase` (`config.toml` de auth), `codebase-design` |
| 1–2 | `domain-modeling`, `tdd` |
| 3 | `supabase-postgres-best-practices`, `supabase`, `security-check` (global) |
| 4 | `security-check` (global) |
| 5 | `supabase` (`getClaims`, MFA), `vercel-react-best-practices`, `vercel-composition-patterns`, `frontend-design` (dentro de `DESIGN.md`), `web-design-guidelines` (revisión), `agent-browser` (verificación) |
| 6–7 | `security-check` (global, revisión completa) |

- Skills globales relevantes que ya tienes: `next-best-practices`, `tailwind-design-system` y `security-check`. Para documentación de librerías, la regla global de Context7 sigue vigente.
- **Solape a evitar:** las globales `sdd` y `task-breakdown` hacen un trabajo parecido a `/to-spec` y `/to-tickets`. No las mezcles en el mismo paso. No he comprobado si pueden activarse solas.
- Los sub-agentes de `code-review` no tienen por qué heredar tus skills de implementación: no cuentes con que revisen aplicando `supabase` o `web-design-guidelines`; pídelo en el prompt si hace falta.

## 7. Riesgos y notas

- **`.scratch/` fuera de git:** sin copia en el historial; lo que deba perdurar se traslada a documentos versionados.
- **Riesgo de las skills:** `to-tickets` y `code-review` salieron con Snyk «Med Risk» (y `improve-codebase-architecture` también con Gen «Med Risk»). Revisa su `SKILL.md` antes de fiarte.
- **Exceso de tests de configuración:** en el Paso 0 se generaron más de 600 casos (la mayoría filas de tablas `it.each`) y varios espejan ficheros de configuración. Las reglas de calidad de tests de la Fase D, la auditoría de la Fase E y el recuento de la Fase G existen para evitarlo. Comprueba que el agente las aplica.
- **Refactor:** el plan del proyecto habla de rojo → verde → refactor. `tdd` saca el refactor del bucle y lo lleva a la revisión; aquí se hace como pasada separada tras el verde y antes de `/code-review`.
- **Tracker local:** sin interfaz ni notificaciones, válido para trabajo en solitario. Para recibir contribuciones externas hará falta GitHub Issues; se cambia volviendo a ejecutar `/setup-matt-pocock-skills`.
- **Sin remoto git todavía:** `code-review` funciona con commits locales, pero no hay PR ni CI hasta tener repo en GitHub.
