---
name: Vigía
version: 0.1-draft
description: Sistema de diseño del panel Vigía. Estilo minimalista y limpio inspirado en el dashboard de Vercel (Geist), con accent azul propio.
themes: [light, dark]
colors:
  light:
    canvas: "#fafafa"
    surface: "#ffffff"
    border-subtle: "#ebebeb"
    border: "#d4d4d4"
    border-input: "#8f8f8f"
    text: "#171717"
    text-secondary: "#666666"
    accent: "#0077b3"
    on-accent: "#ffffff"
    focus: "#0077b3"
    ok: "#176f2f"
    ok-bg: "#e6f4ea"
    warn: "#8a5d00"
    warn-bg: "#fff4d6"
    err: "#d1242f"
    err-bg: "#fdecee"
    unknown: "#5f6368"
    unknown-bg: "#f0f0f0"
  dark:
    canvas: "#0a0a0a"
    surface: "#111111"
    border-subtle: "#242424"
    border: "#2e2e2e"
    border-input: "#6b6b6b"
    text: "#ededed"
    text-secondary: "#a1a1a1"
    accent: "#88cff7" 
    on-accent: "#00263a"
    focus: "#88cff7"
    ok: "#3fb950"
    ok-bg: "#11261a"
    warn: "#e3b341"
    warn-bg: "#2b2210"
    err: "#ff7b72"
    err-bg: "#2d1618"
    unknown: "#a1a1a1"
    unknown-bg: "#1f1f1f"
typography:
  sans: "Geist, ui-sans-serif, system-ui, sans-serif"
  mono: "Geist Mono, ui-monospace, monospace"
  scale:
    page-title: { size: 24px, line: 32px, weight: 600, tracking: -0.02em }
    section: { size: 16px, line: 24px, weight: 600 }
    body: { size: 14px, line: 20px, weight: 400 }
    label: { size: 13px, line: 16px, weight: 500 }
    metadata: { size: 12px, line: 16px, weight: 400 }
    metric: { size: 24px, line: 28px, weight: 600, features: tabular-nums }
spacing: { unit: 4px, scale: [4, 8, 12, 16, 24, 32, 48] }
radius: { sm: 6px, md: 8px, full: 9999px }
elevation: none
icons: { set: lucide, size-ui: 16px, size-table: 14px, stroke: 1.5px }
---

# Vigía — DESIGN.md

> Borrador v0.1. Documento de trabajo en español; **todos los textos de interfaz que aparecen aquí son en inglés** porque así será el producto.
> Fuente de verdad del diseño visual. Las reglas de dominio (semáforo, obsolescencia) no se definen aquí; aquí solo se define cómo se ven.

## 1. Principios visuales

1. **Minimalista y claro.** Superficies planas, bordes de 1 px, sin sombras, mucho aire. La información es lo único con peso visual.
2. **Honesto con lo que no sabe.** «Sin datos» es un estado de primera clase, con su propio icono, texto y estilo. Nunca se disfraza de verde ni de estado neutro.
3. **El color nunca está solo.** Cada estado = icono + texto + color. Debe entenderse en escala de grises.
4. **El azul es interacción, no estado.** El accent se usa en enlaces, foco, selección y acciones. Ningún estado es azul.
5. **Lectura en 2 segundos.** Veredicto primero, detalle después. Lo que necesita atención sube; lo que va bien se calla.

**No hacer:** sombras decorativas, degradados, ilustraciones, animaciones que no comuniquen estado, estilos incrustados (CSP), color como único indicador, series de gráfica en rojo/ámbar/verde.

## 2. Color

### Roles
| Rol | Uso |
|---|---|
| `canvas` | Fondo de página |
| `surface` | Tarjetas, tablas, sidebar, cabecera |
| `border-subtle` / `border` | Separadores internos / contorno decorativo de tarjetas y tablas |
| `border-input` | Contorno de inputs, botones y controles interactivos (≥ 3:1) |
| `text` / `text-secondary` | Texto principal / metadatos, etiquetas, ejes |
| `accent` | Enlaces, foco, elemento activo, serie de gráfica |
| `ok` `warn` `err` `unknown` | **Solo** estados (ver §5). Cada uno con su `-bg` suave para badges |

### Contraste (calculado, WCAG 2.2)
Texto sobre `surface`: todos ≥ 4.5:1 (AA).

| Token | Claro | Oscuro |
|---|---|---|
| text | 17.9 | 16.1 |
| text-secondary | 5.7 | 7.3 |
| accent | 4.9 | 11.1 |
| ok / warn / err | 6.3 / 5.8 / 5.2 | 7.4 / 9.7 / 7.5 |
| unknown | 6.1 | 7.3 |

Texto de estado sobre su propio `-bg` (badges), todos ≥ 4.5:1:

| Token | Claro | Oscuro |
|---|---|---|
| ok | 5.5 | 6.3 |
| warn | 5.3 | 8.1 |
| err | 4.6 | 6.7 |
| unknown | 5.3 | 6.4 |

- `on-accent` sobre `accent` (botones): 4.9 claro / 9.2 oscuro.
- `border-input` sobre `surface`: 3.2 claro / 3.5 oscuro (≥ 3:1, WCAG 1.4.11). `border` y `border-subtle` son decorativos y no lo cumplen a propósito.
- Los valores se recalculan si cambia cualquier token; el script de comprobación vive en la fase de implementación.

### Tema
Sigue `prefers-color-scheme` por defecto, con conmutador manual (Light / Dark / System) en la cabecera (§6). Los tokens se definen como variables CSS en la hoja compilada y se exponen a Tailwind; sin estilos en línea.

## 3. Tipografía

- **Geist Sans** para toda la interfaz. **Geist Mono** solo para valores técnicos: nombres de paquete, versiones, códigos de error, URLs.
- Cifras con `tabular-nums` (latencias, porcentajes, contadores) para que no «bailen».
- Escala corta: ver YAML. Máximo dos pesos por pantalla (400 y 500/600).
- Texto de terceros (`summary`, `package`, códigos): siempre como texto, con `truncate` o `line-clamp-2` + `break-words`; nombres de paquete largos con `min-w-0` y truncado central o final. Nunca deben romper la maquetación.

## 4. Iconografía

- **Lucide**, trazo uniforme, 16 px en interfaz y 14 px en tablas. Siempre acompañados de texto o de `aria-label`.
- Iconos decorativos con `aria-hidden`.

| Uso | Icono |
|---|---|
| Marca | `eye` |
| Overview | `layout-grid` |
| Proyecto | `folder-git-2` |
| Buscar | `search` |
| Tema | `sun` / `moon` / `monitor` |
| Usuario / cerrar sesión | `user` / `log-out` |
| Enlace externo | `external-link` |
| Despliegue | `rocket` |
| Vulnerabilidad | `shield-alert` |
| Latencia | `timer` |
| Frescura del dato | `clock` |

## 5. Estados (semáforo)

Cada estado tiene **color + icono + etiqueta + forma de contorno**. El gris no es un color de interfaz más: es un estado.

| Estado | Etiqueta | Icono | Estilo |
|---|---|---|---|
| ok | `Operational` | `circle-check` | contorno sólido, `ok` |
| warn | `Degraded` / `Needs attention` | `triangle-alert` | contorno sólido, `warn` |
| err | `Down` / `Critical` | `circle-x` | contorno sólido, `err` |
| unknown | `No recent data` | `circle-help` | **contorno discontinuo**, `unknown` |

Reglas:
- Un proyecto en gris **nunca** usa el icono ni el color de verde.
- El veredicto global de la tarjeta se calcula en dominio; la UI solo lo pinta.
- Estados de despliegue: `Building` (`loader`), `Ready` (`circle-check`), `Failed` (`circle-x`), `Unknown` (`circle-help`).
- Gravedades: `Low`, `Medium`, `High`, `Critical`, con icono y orden de intensidad; `Critical` y `High` más peso visual, `Low` y `Medium` discretas (evita fatiga de alertas).

## 6. Layout

### Estructura (escritorio)
- **Sidebar** fija a la izquierda, 240 px, `surface`, borde derecho de 1 px.
- **Cabecera** superior sobre el contenido, 56 px.
- **Contenido** sobre `canvas`, ancho máximo ~1200 px, rejilla de 12 columnas (4 en móvil), huecos de 16–24 px.

### Sidebar (MVP)
1. Marca: icono `eye` + wordmark «Vigía» (Geist, 600).
2. Buscador `Find` con atajo `F`. **Solo se muestra con 10 o más proyectos**; por debajo, la lista cabe en pantalla.
3. `Overview`.
4. Grupo `Projects`: un enlace por proyecto con su **icono de estado** (no un punto de color) y el nombre truncado.
5. Pie: usuario y menú.

**Sin secciones futuras ni «coming soon» en el MVP.** Si se añaden más secciones, se reserva un grupo nuevo; no se anticipan.

### Cabecera
De izquierda a derecha:
- **Título** de la vista (o ruta: `Overview` / `Overview › project-name`).
- **Resumen global**: p. ej. `5 projects · 2 need attention`. Si hay datos obsoletos: `3 have no recent data`.
- **Frescura**: `Updated 3 min ago` con icono `clock`. Si el scheduler parece parado, pasa a estado `unknown` (ver §7.4).
- **Conmutador de tema**: botón de icono (`sun` / `moon` / `monitor`) que alterna Light → Dark → System, con `aria-label` que indica el modo actual y el siguiente.
- **Menú de usuario**: estado de MFA y `Sign out`.

El **selector de rango** (`24 h` · `7 d` · `30 d`) **no va en la cabecera global**: vive en la vista de detalle, junto a la gráfica.

### Móvil (< 768 px)
- La sidebar pasa a un menú desplegable (`menu`).
- El resumen y la frescura bajan a una fila bajo la cabecera; el conmutador de tema y el menú de usuario se mantienen en la cabecera.
- Tarjetas en una columna; las tres señales se apilan en vertical.
- Tabla de vulnerabilidades → lista de filas apiladas (paquete, gravedad, versión corregida, enlace).
- Gráfica simplificada: sin ejes secundarios, mínimo y máximo anotados, rango fijo.
- Objetivos táctiles ≥ 44 px (mínimo WCAG 2.2: 24 px).

## 7. Componentes

### 7.1 Tarjeta de proyecto (vista general)
Estado global + **tres señales visibles** en una fila compacta. Mostrar cada señal por separado evita un verde engañoso cuando una de ellas no tiene datos.

```
┌──────────────────────────────────────────────┐
│ ⚠ Degraded                       project-name│
│ https://example.test                     ↗   │
│──────────────────────────────────────────────│
│ ⏱ Health        🚀 Deploy       🛡 Vulns     │
│ 1.2 s           Ready · 2 h     1 High       │
│ 99.4 % (24 h)                   2 Medium     │
│──────────────────────────────────────────────│
│ 🕐 Checked 3 min ago                         │
└──────────────────────────────────────────────┘
```
- Cabecera: icono + etiqueta del estado global; nombre del proyecto (enlace al detalle).
- Cada señal tiene su propio estado. Si una no tiene datos: `No data` con `circle-help` (p. ej. vulnerabilidades con sync `not_enabled`: `No data · alerts not enabled`).
- **Sin alertas ≠ seguro:** si la sincronización es correcta y no hay alertas, se muestra `No open alerts` (no `Secure` ni `0`), y un texto de ayuda lo aclara en el detalle.
- Tarjeta gris: toda la tarjeta con contorno discontinuo y la antigüedad destacada (`Last data 47 min ago`).
- Hover: borde `border` más marcado, sin sombra. Foco visible (§8).

### 7.2 Badge de estado
Pastilla de `radius.full`, fondo `-bg`, icono + etiqueta. Nunca solo color.

### 7.3 Tabla de vulnerabilidades (detalle)
Columnas: `Package` (mono, truncado) · `Severity` (badge) · `Fixed in` (mono) · `Advisory` (enlace externo).
- Orden por defecto: gravedad descendente.
- Densidad: fila de 40 px (compacta). Cabecera sticky.
- `Advisory`: solo si el enlace es `https` y `github.com`; enlace con icono `external-link`, `rel="noopener noreferrer"`. Si no cumple, texto plano sin enlace.
- Estado vacío: `No open alerts` + aviso: «This only reflects what GitHub has detected. It does not mean the project is secure.»

### 7.4 Banner de datos obsoletos
- **Por proyecto:** en la tarjeta (ver 7.1).
- **Global:** si todos (o la mayoría) los proyectos están en gris, un único banner bajo la cabecera, estado `unknown`: «No project has recent data. The scheduler may have stopped. Check your cron trigger.» En lugar de N tarjetas idénticas gritando.

### 7.5 Gráfica de latencia (SVG renderizado en servidor)
- Una sola serie en `accent`; línea de umbral discontinua a 2 s en `text-secondary` con etiqueta `2 s`.
- **Huecos visibles** (línea interrumpida) donde no hay comprobaciones; no se interpola.
- Puntos `Down`/`Degraded` marcados con su icono/forma, no solo color.
- Eje Y con cero como base; cifras en mono con `tabular-nums`.
- Alternativa accesible: `<table>` oculta visualmente o resumen (`min`, `max`, `p95`) y `aria-label`.
- Sin librería de gráficos con JS en cliente; compatible con CSP (clases Tailwind, sin `style=""`).

### 7.6 Estados de vista
| Estado | Contenido |
|---|---|
| Datos | Normal |
| Vacío | `No projects yet` + una línea: «Projects are added manually. See the install guide.» (sin botón de alta) |
| Error de carga | Icono `circle-x`, `Couldn't load data`, botón `Try again`. Mensaje genérico, sin trazas |
| Obsoleto | Ver 7.4 |

### 7.7 Traducción de códigos de error
Los errores guardados son códigos cerrados. La UI muestra el **mensaje comprensible** y, discreto al lado, el **código en Geist Mono** (`text-secondary`, `metadata`): `Couldn't reach the site · dns`. Un código no reconocido se muestra como `Something went wrong.` sin código (nunca se pinta un valor no catalogado).

| Código | Mensaje |
|---|---|
| `timeout` | The site took too long to respond. |
| `dns` | Couldn't resolve the site's address. |
| `connection` | Couldn't connect to the site. |
| `tls` | The secure connection failed. |
| `too_many_redirects` | The site redirected too many times. |
| `invalid_url` | The project's URL is not valid. |
| `unauthorized` | The credential was rejected. |
| `forbidden` | The credential doesn't have access. |
| `not_found` | The project or repository wasn't found. |
| `rate_limited` | The provider's rate limit was reached. Try again later. |
| `upstream_error` | The provider returned an error. |
| `invalid_response` | The provider's response couldn't be read. |
| `missing_credentials` | No credential is configured for this provider. |
| `unexpected` | Something unexpected went wrong. |

Estados de sincronización de vulnerabilidades (`not_enabled`, `no_access`) usan los mensajes de §7.1, sin código.

### 7.8 Pantallas de acceso
- Login centrado, tarjeta `surface` sobre `canvas`, marca arriba.
- Error único y genérico: `Invalid email or password.` (nunca distingue cuál es incorrecto).
- Error MFA: `Invalid or expired code.`
- Alta de TOTP: QR + clave en mono con botón `Copy`, campo de 6 dígitos.

## 8. Accesibilidad (WCAG 2.2 AA)

- Contraste de texto ≥ 4.5:1; de componentes y focos ≥ 3:1.
- Foco visible y consistente (anillo de 2 px en `focus` + separación de 2 px); nunca se elimina `outline` sin sustituto.
- Todo funciona con teclado; atajo `F` para buscar sin interferir con campos de texto.
- Estados anunciados como texto (no solo icono); `aria-live="polite"` para cambios de frescura.
- Respeta `prefers-reduced-motion`; no hay animaciones salvo el `loader` de «Building».
- Tamaño mínimo de objetivo táctil 24 px (apuntamos a 44 px en móvil).
- Enlaces externos distinguibles por icono, no solo por color.

## 9. Microcopy (inglés)

- Directo, neutro, sin alarmismo ni exclamaciones. Frases cortas.
- Tiempos relativos: `3 min ago`, `2 h ago`; fecha completa en `title`/tooltip.
- Honestidad: `No data`, `No recent data`, `No open alerts`. Evitar `Secure`, `Safe`, `All good`.
- Login siempre genérico (§7.8).

## 10. Implementación con Tailwind y CSP

- Tokens como variables CSS (`--color-surface`, `--color-ok`, …) en la hoja global, con un bloque para `:root` y otro para `.dark` / `prefers-color-scheme`, expuestos al `theme` de Tailwind. **Ningún `style=""` ni `<style>` en línea** (CSP con nonce, sin `unsafe-inline`).
- Variantes de estado mediante clases (`data-[state=down]:…`), no estilos calculados.
- Componentes base propios; Radix solo si hace falta accesibilidad compleja (menú, popover). Sin librería de componentes pesada.
- Geist se sirve **desde el propio origen** (`next/font`), sin CDN externo. Licencia a confirmar antes de publicar (se asume OFL).
- Lucide como paquete de iconos SVG en línea (`lucide-react`); verificar versión y licencia (se asume ISC) al instalar.

## 11. Decisiones cerradas (v0.1)

1. **Buscador de la sidebar:** solo con 10 o más proyectos.
2. **Contraste:** verificado (§2). `ok` y `warn` claros oscurecidos; token `border-input` añadido.
3. **Códigos de error:** catálogo de códigos cerrados con mensajes en §7.7; el código se muestra en mono, discreto.
4. **Conmutador de tema:** botón de icono en la cabecera (§6).
5. **Logotipo:** para el MVP, wordmark «Vigía» + icono `eye`. Un logotipo propio queda fuera de alcance.
6. **Capturas del README:** solo datos ficticios, generadas con un modo demo (ver §12).

## 12. Capturas y datos de demostración

- Solo se usan proyectos ficticios con dominios reservados (`example.test`, `*.example`) y paquetes inventados. Nunca datos reales, ni nombres de proyectos o repositorios propios.
- Se generan desde un seed ficticio, no editando capturas a mano.
- Casos a capturar, en **claro y oscuro**:
  1. Vista general con mezcla: `Operational`, `Degraded`, `Down` y `No recent data`.
  2. Detalle con gráfica con huecos, umbral de 2 s y tabla con una vulnerabilidad `Critical`.
  3. Estado `No open alerts` con su aviso.
  4. Banner global de datos obsoletos.
  5. Estado vacío.
  6. Móvil: vista general y detalle.
- Los textos de las capturas están en inglés. La pantalla de acceso no se captura con datos reales.
