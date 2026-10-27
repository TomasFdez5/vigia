# Vigía: Especificación técnica

Documento de referencia con **todos los detalles de implementación**.

- Qué es el producto: `PRODUCT.md`.
- Qué se espera de cada funcionalidad y en qué orden se construye: `FUNCTIONALITIES.md`. Esa guía remite a las secciones de este documento.
- Este documento está en español por ser de trabajo; el código, los commits, la interfaz y la documentación pública serán en inglés.

## Orden de lectura

| # | Sección | Para qué sirve |
|---|---|---|
| 1 | Contexto | Stack, supuestos y alcance |
| 2 | Arquitectura | Capas, estructura de carpetas, contrato de hosting |
| 3 | Convenciones y calidad | Errores, validación, hooks, CI, tooling |
| 4 | Modelo de datos | Tablas y seguridad de datos |
| 5 | Reglas de dominio | Clasificación, uptime, semáforo, sincronizaciones |
| 6 | Ejecución periódica | Jobs, endpoints, protección |
| 7 | Integraciones externas | Hechos verificados de Supabase, Vercel, Render, GitHub, Next.js |
| 8 | Credenciales | Modelo de tokens de mínimo privilegio |
| 9 | Seguridad por diseño | Amenazas, medidas por funcionalidad, límites |
| 10 | Plan por fases | Orden de construcción con TDD y seguridad por fase |
| 11 | Riesgos | Tabla de riesgos y mitigaciones |
| 12 | Decisiones | Tomadas, pendientes y por verificar |
| 13 | Evolución | Post-MVP |

---

## 1. Contexto

### 1.1 Stack y enfoque

- **Stack:** Next.js (App Router) · TypeScript strict · Tailwind CSS · Supabase (Postgres + Auth) · Vercel · Vitest · Zod.
- **Enfoque:** Clean Architecture + TDD (red → green → refactor).
- **Hosting soportado en el MVP:** Vercel y Render (adaptadores de referencia).
- **Idioma:** código, commits, UI y documentación en inglés. Sin i18n en el MVP.

Dashboard open source para monitorizar proyectos desplegados: salud (uptime/latencia), estado del último deploy y vulnerabilidades conocidas. Diseñado para que cualquiera pueda añadir adaptadores de nuevas plataformas de hosting sin tocar el núcleo.

### 1.2 Supuestos

- Proyecto open source. Cada persona despliega su propia instancia (fork o clon) con su propio Supabase.
- Un único usuario por instancia. Sin registro público.
- Los proyectos monitorizados se registran manualmente (SQL/seed), indicando `provider` y `provider_project_id`. Sin descubrimiento automático.
- Los proyectos monitorizados tienen repo en GitHub con Dependabot activado.
- Solo se monitorizan dominios propios.

### 1.3 Alcance

**Dentro del MVP**
- Estado (up / degraded / down), código HTTP y latencia por proyecto, con histórico. Independiente del hosting.
- Estado y fecha del último deploy, obtenido mediante el adaptador de hosting (Vercel, Render).
- Listado de vulnerabilidades abiertas por proyecto (Dependabot alerts de GitHub).
- Login, vista general (una tarjeta por proyecto) y vista de detalle.
- Documentación para instalar y para contribuir adaptadores.

**Fuera del MVP**
- Alertas (email, Telegram...).
- Análisis de cabeceras de seguridad, SSL y dominio **de los sitios monitorizados** (las cabeceras de seguridad de la propia aplicación sí están en el MVP, ver 9.3).
- Logs, métricas de Vercel Analytics o equivalentes.
- CRUD de proyectos en UI y descubrimiento automático de proyectos.
- Escaneo activo de vulnerabilidades.
- Adaptadores de persistencia distintos de Supabase.

---

## 2. Arquitectura

### 2.1 Regla de dependencias

`domain` ← `application` ← `infrastructure` / `app` (presentación), con `composition` como raíz que conoce todas las implementaciones y `shared` como núcleo común sin dependencias. El dominio y la aplicación no importan Next, Supabase, `fetch`, Zod ni ningún SDK de proveedor.

| Capa | Puede importar | No puede importar |
|---|---|---|
| `shared` | nada | todo |
| `domain` | `domain`, `shared` | todo lo demás |
| `application` | `domain`, `shared`, `application` | `infrastructure`, `composition`, `app` |
| `infrastructure` | `domain`, `shared`, `application`, `infrastructure` | `composition`, `app` |
| `app` | `domain`, `shared`, `application` y un único módulo de `composition` (el contenedor) | `infrastructure` y el resto de `composition` |
| `composition` | todas | (raíz de composición) |

Ver ADR 0001: la presentación solo llega a la infraestructura a través del contenedor.

### 2.2 Estructura

```
src/
├── shared/               Result.ts (utilidades genéricas sin dependencias ni conceptos de negocio)
├── domain/
│   ├── project/          Project.ts
│   ├── health/           HealthCheck.ts, HealthStatus.ts
│   ├── deployment/       Deployment.ts, DeploymentStatus.ts (estados normalizados)
│   └── vulnerability/    Vulnerability.ts, Severity.ts
├── application/
│   ├── ports/            ProjectRepository, HealthCheckRepository,
│   │                     DeploymentRepository, VulnerabilityRepository,
│   │                     HealthProbe, VulnerabilitySource,
│   │                     HostingProvider, HostingProviderRegistry, Clock, Logger
│   └── use-cases/        RunHealthChecks, SyncDeployments, SyncVulnerabilities,
│                         GetDashboardOverview, GetProjectDetail,
│                         PurgeOldHealthChecks
├── infrastructure/
│   ├── supabase/         clientes (usuario / admin) + repositorios
│   ├── http/             FetchHealthProbe
│   ├── github/           GithubDependabotSource
│   └── hosting/
│       ├── vercel/       VercelHostingProvider
│       └── render/       RenderHostingProvider
├── composition/          container.ts + registro de proveedores de hosting + lectura del entorno
└── app/                  Next.js: páginas, componentes, route handlers (cron)
supabase/
├── config.toml           configuración de auth versionada
├── migrations/           esquema, RLS, grants y CHECK
└── tests/                pgTAP (políticas RLS)
tests/
└── contracts/            hosting-provider.contract.ts (suite que todo adaptador debe pasar)
docs/
├── installation.md
├── adding-a-provider.md
└── security.md
```

### 2.3 Flujo

Los route handlers y Server Components solo parsean la entrada, llaman a un caso de uso y presentan el resultado. Obtienen los casos de uso del contenedor de `composition` (único módulo de `composition` que `app` puede importar) y nunca importan `infrastructure`.

### 2.4 Puerto de hosting

```ts
type DeploymentStatus = 'building' | 'ready' | 'failed' | 'unknown';

interface Deployment {
  status: DeploymentStatus;
  deployedAt: Date | null; // null cuando status = 'unknown'
  url: string | null;
}

interface HostingProvider {
  readonly id: string; // 'vercel', 'render', ...
  getLatestDeployment(providerProjectId: string): Promise<Deployment>;
}

interface HostingProviderRegistry {
  get(id: string): HostingProvider | null;
}
```

Se mantiene mínimo a propósito (estado y fecha del último deploy). Se amplía solo ante una necesidad real, para no ajustar el contrato a solo dos proveedores. Con Vercel y Render basta un único identificador por proyecto, así que `provider_project_id text` se mantiene; si un futuro adaptador necesita varios (proyecto + servicio + entorno), se ampliará entonces (p. ej. a `provider_config jsonb`), no antes.

### 2.5 Cómo añade un fork un proveedor

1. Crear `src/infrastructure/hosting/<nombre>/` con una clase que implemente `HostingProvider` y traduzca los estados de la plataforma a `DeploymentStatus`.
2. Registrarla en `composition/` (único archivo compartido que se modifica).
3. Pasar la suite `tests/contracts/hosting-provider.contract.ts`, más tests propios del adaptador con mocks HTTP.
4. Añadir su variable de entorno de token a `.env.example` y documentar el alcance mínimo necesario y cómo crearlo. El adaptador recibe solo su credencial y solo llama a su propio host (ver sección 8).

---

## 3. Convenciones y calidad

### 3.1 Código

- **Errores:** los casos de uso y puertos devuelven `Result<T, E>` (definido en `src/shared/`) para fallos esperados (proveedor caído, sin permisos, repo sin Dependabot, timeout). Las excepciones quedan para bugs.
- **Validación en los bordes con Zod:** respuestas de APIs externas (Vercel, Render, GitHub), variables de entorno (fallo al arrancar si faltan) y filas de BD. Dentro de `domain` y `application` solo circulan tipos ya validados.
- **Determinismo:** `Clock` (y generador de IDs si hace falta) inyectados; prohibido `new Date()` / `Date.now()` en `domain` y `application`.
- **Logging:** puerto `Logger` con redacción (ver 9.3). Sin secretos, tokens ni cabeceras `Authorization` en logs ni en los campos `error_code` de la BD (que guardan códigos normalizados, no texto libre).
- **Capas:** reglas ESLint `no-restricted-imports` por carpeta (sin dependencias extra) que implementan la matriz de la sección 2.1, tanto por ruta relativa como por el alias `@/`.
- **TypeScript:** `strict` más `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns` y `noFallthroughCasesInSwitch`. `exactOptionalPropertyTypes` desactivado de momento (fricción con tipos de librerías); se reconsidera tras el paso de reglas de negocio.
- **ESLint de tipos:** `typescript-eslint` con `strictTypeChecked`; `ban-ts-comment` prohíbe `@ts-ignore` y `@ts-nocheck` (`@ts-expect-error` solo con descripción); `explicit-module-boundary-types` como error en `shared`, `domain`, `application`, `infrastructure` y `composition`.
- Lo que pase de un adaptador al núcleo son tipos del dominio, nunca tipos del SDK/API del proveedor.

### 3.2 Reglas ESLint de seguridad y arquitectura

- `no-restricted-imports` con `patterns[].group`, configurado por carpeta con `files` en flat config: matriz de capas (sección 2.1), `app` solo puede importar el módulo contenedor de `composition`, y el cliente admin (`src/infrastructure/supabase/admin`) solo es importable desde `src/composition/**` y `src/infrastructure/supabase/**`. Sin excepción para los route handlers de cron (ADR 0001).
- `shared`, `domain` y `application` no importan `next`, `react`, `@supabase/*`, `zod` ni módulos `node:`.
- Determinismo: `Date.now`, `new Date()` sin argumentos y el global `fetch` prohibidos en `shared`, `domain` y `application` (`no-restricted-properties`, `no-restricted-syntax`, `no-restricted-globals`), salvo en ficheros de test. `new Date(valor)` con argumento está permitido.
- `no-restricted-properties` con `{ object: 'process', property: 'env' }` (cubre también la desestructuración), permitido solo en `composition/`.
- `react/no-danger` como error.
- Protección de la CSP (DESIGN §10): `react/forbid-dom-props` con `style` y `react/forbid-elements` con `style`.

### 3.3 Tooling

- pnpm 11 con lockfile estricto (`install --frozen-lockfile`); `packageManager: pnpm@11.24.0` y `pmOnFail: error`. Node 24 (LTS activo): `.nvmrc` = `24`, `engines.node` = `>=24.22.1 <25` (24.22.0 es vulnerable al CVE-2026-111497); la CI lee `.nvmrc`.
- Scripts de ciclo de vida de dependencias: bloqueados por defecto; `strictDepBuilds` (por defecto `true` en pnpm 11) hace fallar la instalación hasta decidirlo; se decide en `pnpm-workspace.yaml` con `allowBuilds` (en pnpm 11 `onlyBuiltDependencies` y similares están eliminados). La lista se deriva de la instalación real, con `false` explícito para lo revisado y no necesario y `true` solo con motivo comentado.
- `minimumReleaseAge` de pnpm 11 (1440 min por defecto) se mantiene activo: retrasa la instalación de versiones recién publicadas.
- Vitest + Testing Library + msw. Cobertura con umbrales por capa y `perFile: true`: `shared` y `domain` 100% en statements, branches, functions y lines; `application` 100% en statements, functions y lines y 95% en branches. Sin umbral en infraestructura, composición ni UI. Un test de configuración comprueba que los globs apuntan a las carpetas reales para que el umbral no pase por vacío.
- Tests unitarios colocados junto al código (`Foo.test.ts`); `tests/` para contratos (`tests/contracts/`) y configuración (`tests/config/`).
- Conventional Commits con commitlint (`config-conventional`, `header-max-length` 72, scope libre y opcional). ESLint + Prettier.
- Scripts de `package.json` por comprobación (`lint`, `typecheck`, `test`, `test:coverage`, `secrets`, `secrets:bundle`, `commitlint:range`, `audit`, `build`) compartidos por hooks y CI; `verify` los agrupa para repetir la CI en local.

### 3.4 Hooks (husky) y CI

- `pre-commit` → lint-staged (ESLint + Prettier) y secretlint (con `@secretlint/secretlint-rule-preset-recommend`) sobre los ficheros staged; `commit-msg` → commitlint; `pre-push` → typecheck + tests unitarios.
- Los hooks son una ayuda local y se pueden saltar (`--no-verify`, forks sin `prepare`), por eso **CI repite las mismas comprobaciones** y es la barrera real: lint + typecheck + tests + commitlint + secretlint (sobre todo el repo) + `pnpm audit --prod` (falla con severidad alta o crítica) + secretlint sobre `.next/static` tras `next build` (secretos en el bundle del cliente).
- CI: un único job (`push` a `main` y `pull_request`), con timeout y `concurrency`. Orden: checkout con `fetch-depth: 0`, `pnpm/action-setup`, `setup-node` con `node-version-file: .nvmrc`, `install --frozen-lockfile`, lint, typecheck, `test:coverage`, `commitlint:range`, `secrets`, `audit` (`pnpm audit --prod --audit-level high`), `build`, `secrets:bundle`. Los hooks se desactivan en CI con `HUSKY=0`. `pre-push` ejecuta typecheck y tests sin cobertura; los umbrales se aplican en CI.
- Actions: `permissions` mínimos (`contents: read`), fijadas por SHA, sin `pull_request_target`. Dependabot activado para npm y github-actions sobre el propio Vigía, con `commit-message.prefix` (`chore(deps)` / `ci(deps)`) para que sus commits pasen commitlint.
- secretlint: tres alcances con una sola configuración (`@secretlint/secretlint-rule-preset-recommend`): ficheros staged en `pre-commit`, ficheros trackeados en CI y script local, y `.next/static` tras `next build`. No escanea historia de git: un secreto commiteado y borrado después lo cubre solo el secret scanning del repositorio.

### 3.5 Ajustes del repositorio

Protección de la rama `main` (checks obligatorios, sin force-push), secret scanning y push protection activados, 2FA en la cuenta del propietario, `CODEOWNERS` sobre `src/composition/`, `src/infrastructure/`, `/.github/` y `/pnpm-workspace.yaml`. La revisión obligatoria de code owners solo se activa cuando haya un segundo mantenedor (GitHub no permite aprobar el propio PR). Mientras no exista `docs/security.md`, la lista vive en `docs/repository-settings.md`, que el paso de documentación absorbe. `.env.example` con valores evidentemente inválidos y `.gitignore` que excluye `.env*` salvo `.env.example`.

---

## 4. Modelo de datos (Supabase)

```sql
projects (
  id uuid pk, name text, url text,
  github_repo text,                 -- "owner/repo"
  provider text,                    -- id del HostingProvider: 'vercel' | 'render' | ...
  provider_project_id text,
  health_path text default '/',          -- ruta a sondear
  expected_status text default '200-399',-- rangos/listas aceptadas como "ok", ej. '200-399,401'
  timeout_ms int default 10000,
  created_at timestamptz
)

health_checks (
  id bigint pk, project_id uuid fk,
  status text,                      -- up | degraded | down
  status_code int null,
  latency_ms int null,
  error_code text null,             -- código normalizado (ver 9.3), nunca texto libre
  checked_at timestamptz
)  -- índice (project_id, checked_at desc)

deployments (                       -- último deploy conocido por proyecto
  project_id uuid pk fk,
  status text,                      -- building | ready | failed | unknown
  deployed_at timestamptz null,
  url text null,
  error_code text null,             -- fallo al consultar al proveedor (código normalizado)
  checked_at timestamptz
)

vulnerabilities (
  id uuid pk, project_id uuid fk,
  alert_number int,                 -- nº de alerta de GitHub
  package text, ecosystem text,
  severity text,                    -- low | medium | high | critical
  summary text, advisory_url text,
  vulnerable_range text null, fixed_in text null,
  state text,                       -- open | fixed | dismissed (según GitHub)
  first_seen_at timestamptz, resolved_at timestamptz null,
  unique (project_id, alert_number)
)

vulnerability_syncs (               -- estado de la última sincronización por proyecto
  project_id uuid pk fk,
  status text,                      -- ok | not_enabled | no_access | error
  error_code text null,             -- código normalizado
  last_synced_at timestamptz
)  -- permite mostrar "sin datos" en vez de "sin vulnerabilidades"
```

**Códigos de error normalizados**
- Sonda: `timeout`, `dns`, `connection`, `tls`, `too_many_redirects`, `invalid_url`, `unexpected`.
- Adaptadores y fuente de GitHub: `unauthorized`, `forbidden`, `not_found`, `rate_limited`, `upstream_error`, `invalid_response`, `missing_credentials`.

**Restricciones en BD (`CHECK`)**
- Valores válidos en `status`, `severity`, `state` y `error_code`.
- Longitudes máximas de texto (`summary` ≤ 1024).
- `advisory_url ~ '^https://'`; `url ~ '^https?://'`.
- `timeout_ms` entre 1000 y 30000.
- Formatos de `github_repo` y `provider_project_id`.

**Seguridad de datos**
- RLS activado en todas las tablas.
- `REVOKE ALL` a `anon` y `authenticated`; `GRANT SELECT` solo a `authenticated`. Política `select` para `authenticated`, más política `restrictive` que exige `(select auth.jwt()->>'aal') = 'aal2'` (variante estricta). Sin políticas ni permisos de escritura para usuarios.
- Las escrituras (cron) usan la secret key de Supabase (`sb_secret_...`, sustituye a la antigua service role; salta RLS solo si la petición no lleva token de usuario, así que el cliente admin se crea aparte y nunca con la sesión del usuario), solo en servidor y nunca con prefijo `NEXT_PUBLIC_`. Alternativa de menor privilegio (rol Postgres restringido) descartada en el MVP por fricción de instalación; reconsiderar si crece el uso.
- Auth con registro y acceso anónimo deshabilitados **en la configuración del proyecto** (versionada en `supabase/config.toml`, ver 9.3), y un único usuario creado a mano. Verificarlo en `docs/installation.md` y en el checklist de despliegue.
- Claves de Supabase: usar publishable (`sb_publishable_...`) y secret (`sb_secret_...`). Las legacy `anon`/`service_role` se deprecian a finales de 2026.

---

## 5. Reglas de dominio

**Clasificación de salud** (umbral de latencia global parametrizable; path, status esperados y timeout por proyecto, ver `projects`):
- `down`: timeout (`timeout_ms`), error de red o status ≥ 500.
- `degraded`: status dentro de lo esperado pero latencia > 2000 ms, o status fuera de `expected_status` y < 500 (ej. 404).
- `up`: status dentro de `expected_status` y latencia ≤ 2000 ms.

**Sonda HTTP:** `GET` con `User-Agent: Vigia/<versión>`, lectura del cuerpo limitada a 64 KB, sin reintentos (un cold start puntual puede dar un `degraded` falso; se acepta en el MVP y el histórico lo hace visible).

**Uptime (24 h / 7 d):** `(checks up + degraded) / total de checks` en la ventana. Si hay menos de un mínimo de checks esperados (valor inicial: 50% de los esperados por la frecuencia), se muestra "sin datos" en vez de un porcentaje engañoso.

**Datos obsoletos:** cada tarjeta muestra la antigüedad del último check, deploy y sync. Si supera 3× la frecuencia del job (valor inicial; 15 min para health), se marca "sin datos recientes" (gris) y no cuenta como verde. Así se detecta que el scheduler ha parado.

**Estado global de un proyecto** en la tarjeta:
- Rojo si el último check es `down` o hay vulnerabilidad `critical` abierta.
- Ámbar si es `degraded`, el último deploy está `failed` o hay vulnerabilidad `high` abierta.
- Verde en el resto.
- Gris si algún dato supera el umbral de obsolescencia (nunca verde).

**Sincronización de vulnerabilidades:** upsert por `(project_id, alert_number)`; el `state` refleja el de GitHub (`open | fixed | dismissed`) y las alertas que dejan de aparecer pasan a `fixed`. Cada sync escribe `vulnerability_syncs` por proyecto; un repo sin Dependabot o sin permisos queda como `not_enabled` / `no_access` y la UI muestra "sin datos". Severidad desconocida → `high` (fail-safe). Estado `auto_dismissed` de GitHub → `dismissed` (mapeo propuesto, ver 7.4).

**Sincronización de deploys:** upsert del último deploy por proyecto. Si el proveedor no está registrado o falla la consulta, se guarda `unknown` con el código de error, sin interrumpir al resto de proyectos.

**Anti-amplificación:** los casos de uso omiten un proyecto si su último check/sync es más reciente que un umbral (valores iniciales: health 60 s, deploys 5 min, vulnerabilidades 10 min), usando `Clock`.

---

## 6. Ejecución periódica

| Job | Endpoint | Disparador | Frecuencia |
|---|---|---|---|
| Health checks | `GET /api/cron/health` | GitHub Actions (`schedule`) o cron-job.org | cada 5 min |
| Deploys | `GET /api/cron/deployments` | mismo scheduler | cada 15 min |
| Vulnerabilidades + purga | `GET /api/cron/security` | Vercel Cron | diario |

- Los tres endpoints usan `GET` porque Vercel Cron invoca por GET (verificado en su documentación); se mantiene una sola convención. Un GET con efectos es aceptable aquí porque solo se atiende con el secreto y no es enlazable desde la app.
- Los endpoints exigen `Authorization: Bearer $CRON_SECRET`, comparado con SHA-256 de ambos valores y `crypto.timingSafeEqual` sobre los digests (la documentación de Vercel usa `!==`, que no es de tiempo constante; así tampoco se filtra la longitud). Si falta o no coincide, responden 401. Procedimiento de rotación del secreto documentado (hay que cambiarlo en Vercel y en GitHub Actions a la vez).
- Vercel Cron en Hobby: como mucho 1 vez al día, precisión de ±59 min; vale para el job diario.
- Los pings y consultas a proveedores se ejecutan en paralelo (`Promise.allSettled`), con timeout individual de 10 s, concurrencia acotada (p. ej. 10) y plazo global por debajo de `maxDuration`, con `AbortSignal`.
- Purga de `health_checks` con más de 30 días (job diario).
- Sin locks: los jobs son idempotentes y tolerantes a solapes (un solape solo genera un check extra; los upserts no duplican), con la anti-amplificación de la sección 5.
- Verificar el `maxDuration` de las funciones en el plan vigente de Vercel frente a N proyectos × timeout.
- Los workflows de GitHub Actions programados se desactivan en forks y tras 60 días sin actividad en repos públicos: documentarlo en `installation.md`.
- El scheduler del health check es externo a propósito: Vercel Cron en Hobby es solo diario, y el monitor no debe depender de lo que monitoriza.
- Medidas de seguridad de los endpoints y del workflow: ver 9.3 «Endpoints de cron».

---

## 7. Integraciones externas (verificado 2026-10-27)

Fuente: documentación oficial consultada vía Context7 y las especificaciones públicas (Vercel, Render, Supabase, GitHub, Next.js 16.2.x, pnpm, ESLint). Re-verificar al implementar cada fase.

### 7.1 Supabase

- Claves vigentes: publishable `sb_publishable_...` (baja, expuesta sin riesgo) y secret `sb_secret_...` (alta, solo backend, salta RLS). `anon` y `service_role` son legacy y se deprecian a finales de 2026: no usarlas.
- La secret key solo salta RLS si la petición no lleva token de usuario.
- MFA TOTP gratuita y activa por defecto. Se exige con una política `as restrictive` sobre `(select auth.jwt()->>'aal') = 'aal2'`.
- Límites de Auth (por IP): token 150/5 min (ráfaga 30); verificación 30/5 min; challenge/verify de MFA 15/min (ráfaga 30); registros anónimos 30/h. Configurables en el panel.
- Protección contra contraseñas filtradas: Pro o superior. `config.toml` soporta `enable_signup`, `enable_anonymous_sign_ins`, `minimum_password_length`, `password_requirements` y `jwt_expiry`, aplicables con `supabase config push`.
- `getClaims` verifica la firma del JWT (local con claves asimétricas) y es el método recomendado para proteger páginas; `getSession` no debe usarse para decisiones de autorización. El patrón oficial de `@supabase/ssr` refresca la sesión en el proxy con `getClaims`.
- Variables convencionales de `@supabase/ssr`: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Tests de RLS: pgTAP en `supabase/tests`, `supabase test db` (requiere `supabase start`); `anon` sin `GRANT` recibe 42501. Se simulan rol y claims con `set local role` y `set_config('request.jwt.claims', …, true)`.

### 7.2 Vercel

- Tokens: alcance Full Account / Team / Project; no hay modo solo lectura (un token de equipo lee y escribe todos sus proyectos; uno de proyecto, solo ese). Pueden tener caducidad.
- Últimos deploys: `GET /v7/deployments?projectId=…&limit=1&target=production`. `state`: `BLOCKED | BUILDING | CANCELED | DELETED | ERROR | INITIALIZING | QUEUED | READY`. `url` sin esquema (y `null` si el deploy está incompleto); marcas de tiempo en ms (`created`, `ready`).
- Mapeo propuesto: `READY → ready`; `BUILDING | INITIALIZING | QUEUED → building`; `ERROR → failed`; resto (`CANCELED`, `BLOCKED`, `DELETED`) → `unknown`. `deployedAt = ready ?? created`. Filtrar por `target=production` para que un preview no cuente como "último deploy". La URL sin esquema se normaliza a `https://`.
- Firewall: rate limiting en Hobby con 1 regla por proyecto, clave IP o JA4, ventana de 10 s a 10 min; hasta 3 reglas personalizadas en total; gratuitas. Se crean con `vercel firewall rules add`. No verificado: cabecera HSTS automática (se fija explícitamente).

### 7.3 Render

- API REST en `https://api.render.com/v1`, autenticación `Authorization: Bearer <API key>` (claves `rnd_...`, creadas en Account Settings, no caducan). La documentación no menciona alcances ni modo solo lectura. El rol *Viewer* requiere plan Scale o superior y no consta que limite las API keys.
- Deploys de un servicio: `GET /v1/services/{serviceId}/deploys?limit=1` (`limit` por defecto 20, máximo 100; paginación por `cursor`; filtros `status`, `createdAfter`, etc.). Solo hace falta **un identificador** (`srv-...`). La documentación consultada no fija el orden de la lista: comprobarlo (se espera el más reciente primero) antes de usar `limit=1`.
- Campos del deploy: `id`, `status`, `trigger`, `commit{id,message,createdAt}`, `createdAt`, `startedAt`, `finishedAt`, `updatedAt` (ISO 8601). El deploy no incluye URL: `url = null`.
- `status`: `created | queued | build_in_progress | update_in_progress | live | deactivated | build_failed | update_failed | canceled | pre_deploy_in_progress | pre_deploy_failed`.
- Mapeo propuesto: `live → ready`; `created | queued | build_in_progress | update_in_progress | pre_deploy_in_progress → building`; `build_failed | update_failed | pre_deploy_failed → failed`; `canceled | deactivated` y cualquier valor desconocido → `unknown` (validar con Zod). `deployedAt = finishedAt ?? createdAt`.
- Sin verificar: comportamiento de servicios del plan gratuito que se suspenden por inactividad (puede producir falsos `degraded`/`down` en el health check).

### 7.4 GitHub (Dependabot alerts)

- Endpoint: `GET /repos/{owner}/{repo}/dependabot/alerts`.
- Permiso mínimo con fine-grained PAT: *Dependabot alerts: Read-only* (repositorio); no requiere otros permisos. Un PAT classic exige `security_events`, más amplio: no usarlo.
- `state`: `auto_dismissed | dismissed | fixed | open`. Mapeo propuesto: `auto_dismissed → dismissed`.
- `security_vulnerability.severity`: `low | medium | high | critical`. `security_advisory.summary` con máximo 1024 caracteres. `security_vulnerability.first_patched_version` es objeto o `null`. Paquete en `dependency.package` y `security_vulnerability.package` (`ecosystem`, `name`).
- Paginación: `per_page` por defecto 30, máximo 100; cursores `before`/`after` entregados en la cabecera `Link` (ver restricción de origen en 9.3).

### 7.5 Next.js 16

- `middleware` se llama ahora `proxy` (`proxy.ts`, función `proxy`).
- CSP: o bien estática en `next.config` con `'unsafe-inline'` (sin nonce), o bien con nonce por petición generado en el proxy (exige renderizado dinámico). Elegida la segunda.
- Server Actions: solo POST, cookies `SameSite` y comparación de `Origin`/`Host` (CSRF); `serverActions.allowedOrigins` solo con proxy inverso. Cada acción debe verificar autorización por sí misma.

---

## 8. Credenciales (modelo de tokens de mínimo privilegio)

| Credencial | Configuración | Verificado |
|---|---|---|
| GitHub | Fine-grained PAT con **solo** el permiso de repositorio *Dependabot alerts: Read-only*, limitado a *Only select repositories* (solo los monitorizados) y con caducidad (≤ 90 días). Un fine-grained PAT pertenece a un único propietario (usuario u organización): si hay repos de varios propietarios, un token por propietario. **No usar PAT classic.** | Permiso y endpoint confirmados en la documentación de GitHub. |
| Vercel | **Un token de ámbito Project por cada proyecto monitorizado** (deniega cualquier otro proyecto, equipo o recurso de usuario) y con caducidad. Se guarda en `VERCEL_TOKEN_<PROJECT_ID>`; sin token genérico de equipo como respaldo. | Ámbitos Full Account / Team / Project y caducidad confirmados. No existe modo solo lectura. |
| Render | Una `RENDER_API_KEY` dedicada a Vigía (no reutilizada en otros sitios). | La documentación consultada **no describe alcance, permisos ni caducidad**. **Es el eslabón más débil y no se puede restringir con lo documentado**: si Render ofrece una opción mejor, adoptarla. |
| Supabase | `sb_secret_...` solo en servidor, cliente admin separado de la sesión del usuario. | Confirmado. |

**Variables de entorno (Vercel):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `GITHUB_TOKEN` (fine-grained, solo Dependabot alerts de lectura), `CRON_SECRET`, `RENDER_API_KEY` y un `VERCEL_TOKEN_<PROJECT_ID>` por cada proyecto de Vercel. En GitHub Actions: `CRON_SECRET` (secret) y `APP_URL` (variable).

**Reglas comunes**
- Los secretos solo viven en variables de entorno del servidor, nunca en la BD ni en el repo. El nombre de la variable se **deriva** de `provider_project_id` por convención (`VERCEL_TOKEN_<ID normalizado>`); la BD no contiene nombres de variables para que un valor insertado no pueda hacer leer una variable arbitraria.
- Cada adaptador recibe en su constructor **únicamente su credencial**, nunca el entorno completo ni las credenciales de otros adaptadores; esa resolución se hace en `composition/`.
- Cada adaptador solo llama al host de su propia API (URL base fija; no se acepta una URL arbitraria de la BD ni redirecciones a otros hosts).
- Caducidad y rotación: calendario documentado en `installation.md` y `security.md`; los tokens se crean con caducidad cuando la plataforma lo permite.
- Limitación honesta: todos los tokens viven en el mismo entorno de Vercel, así que un compromiso de ese entorno los expone todos. El alcance mínimo reduce el daño de la fuga de un token concreto y evita dar acceso a proyectos que Vigía no monitoriza.

---

## 9. Seguridad por diseño

### 9.1 Activos y adversarios

**Activos**
1. Credenciales: secret key de Supabase, tokens de GitHub/Vercel/Render, `CRON_SECRET`.
2. Datos: la lista de proyectos con sus vulnerabilidades abiertas es un **mapa de ataque**; su confidencialidad importa aunque cada dato sea poco sensible.
3. Integridad de lo que se muestra: un falso verde es peor que no tener monitor.
4. Disponibilidad del propio monitor.

**Adversarios considerados**
- A1: internet anónimo (pantalla de login, endpoints de cron).
- A2: contenido externo hostil (respuestas de los sitios sondeados, de las APIs de hosting/GitHub, textos de advisories).
- A3: código de terceros (dependencias, adaptadores aportados).
- A4: fuga accidental (repo público, logs, bundle del cliente).
- A5: errores de configuración del propietario.

Fuera de alcance: compromiso de la cuenta del propietario o de las plataformas (Vercel, Supabase, GitHub).

### 9.2 Principios

Denegar por defecto · mínimo privilegio · validar en los bordes y no confiar en datos externos · fallar cerrado · secretos solo en servidor · defensa en profundidad (nunca una única barrera) · configuración segura **versionada** y reproducible, no manual.

### 9.3 Medidas por funcionalidad

**Login y sesión** (amenaza: A1, fuerza bruta/credenciales robadas sobre un único usuario con acceso a todo)
- `supabase/config.toml` versionado y aplicado con `supabase config push`: `enable_signup = false`, `[auth.email] enable_signup = false` (el global tiene precedencia, pero el del proveedor de email vale `true` por defecto y se fija explícito), `enable_anonymous_sign_ins = false` (un usuario anónimo recibe el rol `authenticated` y pasaría la política de lectura), `minimum_password_length = 12`, `password_requirements = "letters_digits"` y `jwt_expiry = 3600` explícito (valor por defecto de la CLI, fijado para que un cambio de default no altere la ventana de sesión revocada). La protección contra contraseñas filtradas (HaveIBeenPwned) **no** se puede fijar con `config push` y además es una función del plan **Pro o superior**: en el plan gratuito no existe, por lo que la longitud mínima y los requisitos de caracteres son la defensa, junto con MFA.
- **MFA TOTP obligatoria**. El usuario se registra en el primer login y la app exige nivel `aal2`: comprobación en servidor y política RLS `restrictive` (ver «Autorización»). Con ello una contraseña robada no basta.
- Sin cliente de Supabase en el navegador: login, logout y MFA por Server Actions. La URL y la publishable key usan los nombres convencionales `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; son públicas por diseño. La secret key (`SUPABASE_SECRET_KEY`) nunca lleva ese prefijo.
- El parámetro de retorno tras el login (`next`) solo admite rutas relativas internas (evita redirección abierta).
- Mensajes de error de login genéricos (sin enumeración de usuarios).
- Límite de intentos: los de Supabase Auth son **por IP, no por cuenta** (endpoint de token: 150 peticiones/5 min con ráfagas de 30; challenge/verify de MFA: 15/min). Con login por Server Actions, Supabase ve la IP de salida del servidor y no la del atacante (no verificado cómo se propaga la IP del cliente), así que esos límites son un respaldo débil y compartido. Medida: regla de **rate limiting en el Vercel Firewall** sobre `POST /login` por IP (en Hobby se permite 1 regla de rate limit por proyecto, ventana de 10 s a 10 min), creada con `vercel firewall rules add` y documentada como paso de instalación. La defensa principal siguen siendo MFA y la contraseña larga.
- Sesión: la protección de páginas y datos usa `getClaims` (verifica la firma del JWT; con claves asimétricas, por defecto en proyectos nuevos, lo hace en local), nunca el objeto de usuario de `getSession`, porque las cookies pueden falsificarse. El nivel `aal` se lee de los claims. Límite: la verificación local no consulta al servidor, así que una sesión revocada sigue siendo válida hasta que caduca el JWT (`jwt_expiry` es configurable en `config.toml` y está fijado en 3600 s).
- Defensa en profundidad: `proxy.ts` solo redirige (protege todo salvo `/login` y `/api/cron/*`); cada Server Component/caso de uso de lectura verifica la sesión en servidor con `getClaims`; RLS es la última barrera. No se confía en el proxy como única protección (CVE-2025-29927).
- Cada Server Action comprueba la sesión (`aal2`) por sí misma; no se asume que el proxy ya lo hizo.
- Páginas autenticadas con `Cache-Control: no-store`.
- No hay endpoints que modifiquen estado autenticados por cookie salvo las Server Actions (los de cron usan bearer). CSRF cubierto por la comprobación `Origin`/`Host` de Next.
- Tests: sin sesión → redirección; sesión `aal1` → sin datos; `next=https://evil.test` ignorado.

**Autorización de lectura / RLS** (amenaza: A1, lectura de datos por un usuario autenticado sin MFA o por una clave pública)
- `REVOKE ALL` sobre todas las tablas a `anon` y `authenticated`, y `GRANT SELECT` solo a `authenticated`; sin permisos de escritura para nadie salvo la secret key. RLS es el segundo seguro, no el único.
- Política de lectura para `authenticated` **más** política `restrictive` que exige `(select auth.jwt()->>'aal') = 'aal2'`. Se usa la variante estricta: la variante de la documentación que acepta `aal1` cuando no hay factor inscrito dejaría pasar a un usuario sin MFA.
- La UI lee **solo con el cliente de usuario** (RLS aplicado). El cliente admin (secret key) vive en `infrastructure/supabase/admin`, con `import 'server-only'`, y una regla ESLint solo permite importarlo desde `src/composition/**` y `src/infrastructure/supabase/**` (los route handlers de cron lo usan a través del contenedor, ver ADR 0001).
- Tests de RLS con pgTAP en `supabase/tests/*.test.sql`, ejecutados con `supabase test db` (requiere `supabase start`, es decir Docker). Casos: `anon` recibe error 42501 al leer y escribir (sin `GRANT`); `authenticated` en `aal1` no ve filas; en `aal2` sí; ningún rol de usuario puede escribir. **Recomendado ejecutarlos en CI** (decisión pendiente, ver 12.2).

**Endpoints de cron** (amenaza: A1, ejecución no autorizada, amplificación de coste, abuso de cuotas de APIs)
- Fallar cerrado: sin `CRON_SECRET` o con menos de 32 caracteres, la app no arranca y el endpoint nunca queda abierto. Generación documentada (`openssl rand -base64 32`).
- Comparación: SHA-256 de ambos valores y `crypto.timingSafeEqual` sobre los digests (no filtra ni la longitud).
- Solo `GET`; otros métodos → 405. `dynamic = 'force-dynamic'` y `Cache-Control: no-store`.
- Respuesta mínima: 401 genérico sin detalle; 200 solo con contadores. Nunca nombres de proyecto ni errores. Nunca se registra la cabecera `Authorization`.
- Anti-amplificación (por si el secreto se filtra): umbrales de la sección 5, concurrencia acotada y plazo global por debajo de `maxDuration`, con `AbortSignal`.
- Workflow de Actions: `permissions: {}`; disparadores solo `schedule` y `workflow_dispatch` (nunca `pull_request_target`); secreto vía `secrets.CRON_SECRET` y URL vía `vars.APP_URL` (https); `curl --fail --silent --show-error --proto '=https' --max-time 30`, sin modo verboso; acciones fijadas por SHA.
- Tests: sin cabecera, esquema distinto de `Bearer`, secreto incorrecto o de otra longitud → 401; método distinto de GET → 405; el cuerpo no contiene datos; el umbral anti-amplificación omite proyectos recientes.

**Sonda HTTP** (amenaza: A2/A5, SSRF, URLs mal formadas, filtración por errores)
- La URL se construye con `new URL(health_path, project.url)` y se **comprueba que el origen no cambia** (rechaza `//host`, `\`, CR/LF y esquemas distintos de `http`/`https`); sin credenciales en la URL.
- Redirecciones: máximo 3, cada salto validado, y un salto de `https` a `http` se trata como error.
- Cabeceras fijas (`User-Agent`, `Accept`); nunca cookies ni credenciales.
- Cuerpo: se lee hasta 64 KB y se descarta; solo se guardan estado HTTP y latencia. Nada del cuerpo se almacena ni se muestra.
- `timeout_ms` acotado (1000–30000) y aplicado con `AbortSignal.timeout`.
- Los errores se persisten como **código normalizado**, no como texto libre: evita filtrar IPs o hosts internos.
- Límite conocido: no se bloquean IPs privadas (el propietario controla las URLs y Vigía corre sin red interna). Es obligatorio resolver DNS y bloquear rangos privados/link-local/metadatos antes de añadir cualquier CRUD en UI.
- Tests: `//evil.test`, `https://a@b`, `ftp://`, redirección a `http`, 4 redirecciones, cuerpo gigante, timeout, error sin texto libre.

**Adaptadores de hosting** (amenaza: A2/A3, fuga de token, SSRF, datos hostiles)
- URL base fija por adaptador; los identificadores se validan con un patrón (Vercel `prj_[A-Za-z0-9]+`, Render `srv-[a-z0-9]+`) y se interpolan con `encodeURIComponent`.
- Llamadas con `redirect: 'error'`, timeout de 10 s y respuesta máxima de 1 MB; todo se valida con Zod y los valores desconocidos caen en `unknown`.
- Credencial: solo por constructor; `process.env` se lee únicamente en `composition/` (regla ESLint `no-restricted-properties` en el resto). Sin credencial → `unknown` con código `missing_credentials` y **sin** respaldo a otra credencial.
- Errores mapeados a códigos cerrados, nunca cuerpos ni cabeceras.
- Límite honesto: un adaptador se ejecuta en el mismo proceso y podría leer el entorno o llamar a otro host; no hay sandbox. Se trata como código de confianza: `CODEOWNERS` sobre `composition/` e `infrastructure/`, lista de comprobación en la plantilla de PR y suite de contrato con `msw` configurado con `onUnhandledRequest: 'error'` (falla si el adaptador llama a un host no previsto) y test de que no registra el token.

**Fuente de GitHub (Dependabot)** (amenaza: A2, fuga del token por paginación o redirección, datos hostiles)
- `github_repo` validado con `^[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}$` (sin segmentos `.` ni `..`) y cada parte con `encodeURIComponent`.
- Paginación: **no se sigue ciegamente la URL de la cabecera `Link`**. Solo se sigue si su origen es exactamente `https://api.github.com`; el token nunca se envía a otro host.
- `redirect: 'error'`, timeout y límite de tamaño como en los adaptadores. 403/429 → no se reintenta en bucle (se respeta `Retry-After`).
- Severidad desconocida → se trata como `high` (principio fail-safe: ante la duda no se oculta).
- La UI indica que muestra solo alertas de Dependabot: «sin alertas» no equivale a «seguro».
- Tests: `Link` hacia otro host no se sigue; `../` en `github_repo` rechazado; severidad desconocida → `high`.

**Persistencia y escrituras** (amenaza: A2, datos hostiles almacenados; A5)
- Todo dato externo pasa por Zod antes de escribir. Además, `CHECK` en BD (ver sección 4).
- Solo supabase-js con parámetros; sin SQL dinámico ni `rpc` que concatene.
- Datos de ejemplo únicamente ficticios (dominios `example.com`/`.test`).
- Tests de integración: la BD rechaza filas que incumplen los `CHECK`.

**Renderizado de la UI** (amenaza: A2, XSS y enlaces maliciosos con datos de terceros)
- Los textos de terceros (`summary`, `package`, códigos de error) se renderizan solo como texto; `react/no-danger` como error de ESLint.
- Enlaces: `advisory_url` solo si es `https` y el host está en lista permitida (`github.com`); `deployment.url` y `project.url` solo `http(s)`; siempre `rel="noopener noreferrer"`. Los adaptadores normalizan URLs sin esquema (Vercel) a `https://`.
- CSP con nonce generado en `proxy.ts`, sin `'unsafe-inline'` (todas las páginas son dinámicas porque requieren sesión): `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`. La librería de gráficos debe ser compatible con CSP (preferir SVG renderizado en servidor).
- Cabeceras (en `next.config`): `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` mínima. `robots` con `noindex` (el panel es privado).
- Páginas de error genéricas, sin trazas.
- Tests de componentes: `javascript:alert(1)` en `advisory_url` no genera enlace; `<img onerror>` en `summary` se muestra como texto.

**Configuración, secretos y build** (amenaza: A4/A5)
- Un único módulo de entorno con Zod (`import 'server-only'`) que falla al arrancar si falta algo; los secretos no se importan desde componentes cliente.
- `.gitignore` excluye `.env*` salvo `.env.example`, cuyos valores son marcadores evidentemente inválidos.
- CI tras `next build`: `secretlint` sobre `.next/static` para detectar secretos en el bundle del cliente.

**Cadena de suministro y repositorio** (amenaza: A3): ver 3.3, 3.4 y 3.5. Retraso mínimo de publicación para dependencias nuevas: `minimumReleaseAge` de pnpm 11 (1440 min por defecto), verificado en su documentación. Si Dependabot respeta ese retraso no está verificado.

**Logs y errores** (amenaza: A4)
- Puerto `Logger` con redacción: claves `authorization`, `token`, `key`, `secret`, `password`, `cookie` → `[REDACTED]`; nunca se registran cabeceras ni cuerpos de peticiones/respuestas externas.
- Los errores persistidos y mostrados son códigos, no texto libre.
- Test: el logger redacta; un error de adaptador no contiene el token.

### 9.4 Límites conocidos (lo que este diseño no cubre)

- Compromiso del entorno de Vercel: expone todas las credenciales a la vez (el alcance mínimo solo limita el daño de la fuga de un token concreto).
- Adaptadores maliciosos: no hay aislamiento en el proceso; la defensa es la revisión de código.
- La API key de Render no se puede restringir con lo documentado.
- SSRF hacia IPs privadas: aceptado mientras el propietario controle las URLs (obligatorio resolverlo antes de un CRUD en UI).
- Quien tenga la secret key de Supabase puede falsear cualquier dato; quien tenga solo `CRON_SECRET` puede forzar ejecuciones (acotado por la anti-amplificación) pero no falsear datos.
- Vigía no escanea nada: muestra lo que Dependabot reporta, y no detecta cambios de contenido del sitio sondeado.
- No hay protección contra contraseñas filtradas en el plan gratuito de Supabase (solo Pro o superior).
- Una sesión revocada sigue siendo válida hasta que caduca su JWT (verificación local de `getClaims`).
- Los límites de intentos de Supabase Auth son por IP; el control real del login depende de la regla del Vercel Firewall (1 regla de rate limit en Hobby), de MFA y de la contraseña.

---

## 10. Plan por fases (TDD)

Cada tarea empieza con el test que falla. Las medidas de seguridad de cada fase se construyen en esa misma fase.

### Fase 0: Setup
- Next.js + TS strict + Tailwind + ESLint + Prettier.
- Vitest + Testing Library + msw.
- CLI de Supabase como dependencia fijada y `supabase/config.toml` con la configuración de auth (sección 9.3). El proyecto de Supabase en la nube, `supabase start` y `config push` no son de esta fase.
- Estructura de carpetas de la sección 2.2 (solo el primer nivel de cada capa, con `.gitkeep`) y reglas ESLint de la sección 3.2.
- Tailwind con los tokens de `DESIGN.md` (claro y oscuro), tipografía y Geist local (`next/font/local`, licencia OFL incluida), con test de contraste; sin conmutador de tema, componentes, iconos ni CSP.
- `CODEOWNERS`, configuración de Dependabot y `docs/repository-settings.md`.
- pnpm, Node LTS, `allowBuilds`, Zod, commitlint, cobertura (sección 3.3).
- husky + lint-staged + secretlint, configurados antes del primer commit con código (sección 3.4).
- CI mínima de la sección 3.4; ajustes del repo (sección 3.5).
- Módulo de entorno con Zod y `server-only`.
- `.env.example` y `.gitignore` revisados desde el primer commit (sin secretos ni datos personales en el repo).

### Fase 1: Dominio
- `HealthStatus`: clasificación según la sección 5 (tabla de casos: 200 rápido, 200 lento, 404, 401 esperado, 500, timeout).
- Indicador de datos obsoletos (stale) y `Result<T, E>` (en `src/shared/`).
- `DeploymentStatus` y `Severity`: tipos y comparación (severidad desconocida → `high`).
- Estado global de proyecto (semáforo).
- Códigos de error como tipos del dominio. Dominio sin dependencias.

### Fase 2: Casos de uso (con fakes en memoria)
- `RunHealthChecks`: sondea todos los proyectos, persiste un check por proyecto, un fallo individual no aborta al resto.
- `SyncDeployments`: resuelve el proveedor por `project.provider`, guarda el último deploy, maneja proveedor desconocido y errores.
- `SyncVulnerabilities`: inserta nuevas, actualiza existentes, marca resueltas las ausentes.
- `PurgeOldHealthChecks`: respeta el umbral con `Clock` fake.
- `GetDashboardOverview` y `GetProjectDetail`: último check, último deploy, uptime 24 h/7 d, vulnerabilidades abiertas.
- Umbrales anti-amplificación con `Clock`; errores como códigos.

### Fase 3: Infraestructura
- Suite de contrato `hosting-provider.contract.ts`.
- `VercelHostingProvider` y `RenderHostingProvider` (tests con msw + suite de contrato). Verificar su documentación oficial vigente antes de implementar (sección 7).
- `FetchHealthProbe` (msw): mide latencia, timeout, errores de red; validación de URL, redirecciones y tope de cuerpo.
- `GithubDependabotSource` (msw): paginación (regla del origen de `Link`), mapeo de severidad, repo sin Dependabot o sin permisos (error controlado).
- Repositorios Supabase (integración contra Supabase local) + migraciones SQL con RLS, `REVOKE`/`GRANT` y `CHECK`; tests pgTAP de RLS.
- Seed de ejemplo con proyectos ficticios.
- Tests de seguridad listados en 9.3 (adaptadores, sonda, GitHub, persistencia).

### Fase 4: Entrada (route handlers de cron)
- Tests: 401 sin secreto o con secreto incorrecto, 405 con otro método, 200 con secreto válido, el handler solo delega al caso de uso; fallo de arranque sin `CRON_SECRET`.
- Workflow de GitHub Actions endurecido para health y deployments, y `vercel.json` con el cron diario.

### Fase 5: UI
- Auth: login con Supabase (email + contraseña) y MFA TOTP obligatoria por Server Actions; `proxy.ts` que protege todo salvo `/login` y `/api/cron/*`; verificación en servidor con `getClaims`; regla de rate limiting en Vercel Firewall.
- Cabeceras de seguridad y CSP con nonce (sección 9.3).
- Vista general: tarjetas semáforo (estado, latencia, último deploy, nº de vulnerabilidades por severidad, antigüedad del dato).
- Detalle de proyecto: gráfico de latencia, uptime, estado del deploy, tabla de vulnerabilidades (paquete, severidad, versión corregida, enlace al advisory).
- Renderizado seguro y enlaces filtrados.
- Tests de componentes para estados vacío, error y datos, y los casos de seguridad de 9.3.

### Fase 6: Documentación open source
- `README` (qué es, capturas con datos ficticios, arranque rápido).
- `docs/installation.md`: Supabase, variables de entorno, alta manual de proyectos, schedulers, rotación de credenciales.
- `docs/adding-a-provider.md`: guía paso a paso y plantilla de adaptador.
- `docs/security.md`: lista de comprobación de instalación (registro desactivado, MFA activada, alcance de tokens, ajustes del repo, regla de firewall) y guía de rotación/respuesta ante la fuga de cada credencial.
- `CONTRIBUTING.md`, `SECURITY.md` (política de divulgación) y plantillas de issues/PR (incluida una para adaptadores de hosting).

### Fase 7: Despliegue
- Variables de entorno en Vercel (sección 8).
- Primer despliegue, ejecución manual de los tres crons y verificación end-to-end.
- Comprobación final con la lista de `docs/security.md` y ejecución de `security-check` (OWASP) sobre el código completo antes de publicar el repo.
- Decidir la licencia antes de publicar.
- Smoke test E2E opcional (Playwright): login → ver las tarjetas.

---

## 11. Riesgos

| Riesgo | Mitigación |
|---|---|
| Fuga de secret key de Supabase o de tokens (repo público) | Solo en servidor, sin prefijo público, tokens con el scope mínimo que ofrezca cada plataforma (**ni Vercel ni Render documentan tokens de solo lectura**; una fuga permitiría modificar o redeployar; ver sección 8), `.env.example` sin valores, revisión previa a cada commit |
| Tests de RLS y repositorios solo en local, no en CI (decisión actual) | Ejecutarlos localmente antes de cada release y en el pre-push si es viable; reconsiderar `supabase start` en CI (recomendado) |
| Cadena de fallos: Actions desactivado → BD sin actividad → Supabase pausa el proyecto | Indicador de datos obsoletos, documentar el riesgo y el aviso de pausa de Supabase |
| La API key de Render no se puede restringir con lo documentado (sin alcance ni solo lectura) | Clave dedicada, solo servidor, rotación documentada; revisar si Render ofrece una opción mejor antes de la fase 3 |
| Adaptador de terceros que reciba tokens de hosting | Revisión cuidadosa de PRs de adaptadores y aviso en `adding-a-provider.md` |
| Endpoints de cron expuestos | `CRON_SECRET` + comparación en tiempo constante; sin él, 401 |
| Contrato `HostingProvider` ajustado a solo dos proveedores | Mantenerlo mínimo y ampliarlo solo con casos reales |
| Fricción de instalación (cada fork necesita su Supabase y un token por proyecto de Vercel) | Documentación y migraciones reproducibles |
| Supabase free pausa proyectos inactivos (~7 días) | El cron de 5 min mantiene actividad; verificar en el plan vigente |
| GitHub Actions `schedule` puede retrasarse unos minutos | Aceptable a esta escala; alternativa cron-job.org |
| Dependabot no activado en algún repo | Se muestra "sin datos", no "sin vulnerabilidades" |
| Falsos "down" por fallos puntuales de red | Mostrar histórico; reintento antes de marcar `down` como mejora posterior |
| El scheduler se detiene sin aviso (Actions desactivado en forks o por inactividad, caída de Vercel) | Indicador de antigüedad en la UI; documentarlo; heartbeat externo como mejora posterior |
| Filtración de secretos en repo público | secretlint en pre-commit (husky) y en CI; los hooks locales son saltables, así que CI es la barrera real; revisión manual antes de publicar el repo |
| Cron excede `maxDuration` de Vercel con muchos proyectos | Verificar límites; paralelismo con timeout; dividir por lotes si hace falta |
| SSRF vía URL de proyecto | Validación de esquema/origen/redirecciones; bloqueo de IPs privadas si se añade CRUD |
| El panel es un mapa de ataque (proyectos + vulnerabilidades abiertas) | MFA obligatoria, RLS con `aal2`, sin registro ni acceso anónimo, `noindex`, capturas del README solo con datos ficticios |
| Secreto de cron filtrado: ejecuciones forzadas y consumo de cuotas | Umbrales anti-amplificación, concurrencia acotada, rotación documentada |
| Datos hostiles de terceros mostrados en la UI (XSS, enlaces `javascript:`) | Renderizado solo como texto, enlaces filtrados por esquema/host, CSP con nonce, `CHECK` en BD |
| Adaptador malicioso (sin aislamiento en el proceso) | Revisión de código, `CODEOWNERS`, suite de contrato con hosts bloqueados salvo el previsto |
| Fuerza bruta contra el login con límites de Supabase por IP | Regla de rate limiting en Vercel Firewall, MFA, contraseña larga |
| Límites y APIs de Vercel/Render/Supabase cambian | Revisar documentación oficial antes de las fases 3 y 7 |
| Sin licencia, el código es legalmente "todos los derechos reservados" y nadie puede usarlo ni hacer fork | Decidir licencia antes de publicar el repo |

---

## 12. Decisiones

### 12.1 Tomadas

**Producto y reglas**
- Registro manual de proyectos.
- Health check configurable por proyecto (`health_path`, `expected_status`, `timeout_ms`).
- Indicador de datos obsoletos en la UI; sin heartbeat externo en el MVP.
- Uptime por nº de checks (degraded cuenta como up), "sin datos" bajo el mínimo.
- Sonda: GET, 64 KB máx., User-Agent propio, sin reintentos.
- `vulnerabilities.state` = `open | fixed | dismissed` + tabla `vulnerability_syncs`.
- Idioma: inglés en código, UI y docs.

**Arquitectura y calidad**
- Errores con `Result<T, E>`; validación con Zod en los bordes.
- ESLint + Prettier + Conventional Commits (commitlint); secretlint + husky (pre-commit, commit-msg, pre-push) y las mismas comprobaciones en CI.
- Tooling: pnpm 11 + Node 24 fijado, cobertura por capa con `perFile` (100% en `shared`/`domain`; 100% y 95% de branches en `application`), `SECURITY.md` y plantillas.
- Presentación solo llega a infraestructura a través del contenedor de composición (ADR 0001).
- Fases en el orden original (sin walking skeleton temprano).

**Seguridad**
- Escrituras con la secret key de Supabase (`sb_secret_...`).
- Login: email + contraseña, más MFA TOTP obligatoria (`aal2` exigido también en RLS).
- Auth de la app: `proxy.ts` + verificación en servidor + RLS; cabeceras de seguridad y CSP con nonce.
- Sin cliente Supabase en el navegador; configuración de auth versionada en `config.toml`.
- Errores como códigos normalizados; validación estricta de URLs e identificadores; paginación de GitHub restringida a `api.github.com`; renderizado y enlaces seguros; `docs/security.md`.
- SSRF: validación básica. Cron idempotente sin locks, con anti-amplificación.
- Endpoints de cron por `GET` (requisito de Vercel Cron), secreto con SHA-256 + `timingSafeEqual`.
- Modelo de tokens de mínimo privilegio (sección 8).
- Tests de integración Supabase/RLS fuera de CI por ahora (ver 12.2).

### 12.2 Pendientes (propuestas)

1. Frecuencia del health check: 5 min.
2. Scheduler: GitHub Actions (alternativa: cron-job.org).
3. Retención del histórico: 30 días.
4. Licencia (MIT recomendada; decidir antes de publicar).
5. Umbral de "stale": 3× la frecuencia de cada job.
6. Tests de RLS (pgTAP) en CI con `supabase start`: recomendado (viable, ver 7.1), pendiente de confirmación.

### 12.3 Por verificar al implementar

- Orden de la lista de deploys de Render (se espera el más reciente primero).
- Comportamiento de servicios gratuitos de Render que se suspenden (falsos `degraded`/`down`).
- Cabecera HSTS automática en Vercel.
- Valor de `jwt_expiry` en un proyecto de Supabase en la nube (el de la CLI es 3600 s y está fijado en `config.toml`).
- Comportamiento de un umbral de cobertura por glob cuando no hay ficheros (Paso 0).
- Si `instrumentation.ts` puede saltarse la fase de build de Next 16 (Paso 0).
- Si Dependabot respeta `minimumReleaseAge` y su soporte de pnpm 11.
- Que las fuentes Geist incluyen la feature `tnum`.
- Cómo propaga Supabase la IP del cliente cuando el login pasa por Server Actions.
- Que el workflow de GitHub Actions para `supabase start` funcione sin sorpresas.
- Que las reglas de Vercel Firewall puedan versionarse o solo crearse por CLI.
- `maxDuration` de Vercel frente a N proyectos × timeout.
- Pausa de Supabase en el plan gratuito (tiempo vigente).
- Opciones de restricción de la API key de Render.
- Atributos de las cookies de sesión de `@supabase/ssr`.

---

## 13. Evolución posible (post-MVP)

Análisis de cabeceras de seguridad y SSL de los sitios monitorizados, alertas ante cambios de estado, reintento antes de marcar `down`, heartbeat externo, descubrimiento automático de proyectos por proveedor, adaptadores de persistencia alternativos, más proveedores de hosting aportados por la comunidad, y bloqueo de IPs privadas en la sonda si se añade CRUD en UI.
