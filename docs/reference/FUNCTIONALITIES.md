# Vigía: Funcionalidades

> Qué se espera de cada funcionalidad, sus restricciones y sus medidas de seguridad, más el orden de implementación.
> **No contiene detalles de implementación**: eso está en `SPEC.md` (ver la tabla «Dónde está el detalle» al final de la lista de funcionalidades).
> Contexto general en `PRODUCT.md`.

## Cómo leer este documento

1. Parte 1: las funcionalidades (F1–F16), agrupadas por tema.
2. Parte 2: el orden en que se construyen, con criterio de «hecho» para cada paso.
3. Parte 3: decisiones todavía abiertas.

Principios de seguridad que se aplican a todas las funcionalidades: denegar por defecto, mínimo privilegio, no fiarse de datos externos, fallar cerrado (ante la duda, no dar acceso), nunca depender de una única barrera y que la configuración segura esté escrita y sea reproducible, no manual.

---

## Parte 1. Funcionalidades

### A. Vigilancia de proyectos

#### F1. Alta de proyectos vigilados
**Qué se espera**
- El propietario registra cada proyecto a mano con: nombre, dirección web, repositorio de GitHub, plataforma de alojamiento y su identificador en esa plataforma.
- Opcionalmente ajusta, por proyecto, qué página comprobar, qué respuestas se consideran normales y cuánto esperar como máximo.
- Hay valores por defecto razonables (página principal, respuestas correctas o redirecciones, espera de 10 s).

**Restricciones**
- No hay alta desde la interfaz ni descubrimiento automático en el MVP.
- Solo se vigilan dominios propios.
- Cada proyecto debe tener repositorio en GitHub para mostrar vulnerabilidades.

**Seguridad**
- Todos los datos introducidos se validan: la dirección debe ser web (http/https), sin credenciales incrustadas; la página a comprobar no puede cambiar el sitio al que se consulta; el repositorio y los identificadores de plataforma tienen un formato estricto; el tiempo de espera tiene un máximo.
- La validación se aplica en la entrada y también en el almacenamiento, de modo que un dato incorrecto insertado a mano sea rechazado.
- Los proyectos de ejemplo usan únicamente datos ficticios.

#### F2. Comprobación de salud
**Qué se espera**
- Cada pocos minutos se consulta cada proyecto y se registra: estado, código de respuesta, tiempo de respuesta y, si falla, la categoría del error.
- Clasificación: **caído** (sin respuesta, tiempo agotado o error del servidor), **degradado** (responde fuera de lo esperado o con más de 2 s) y **funciona**.
- Un fallo en un proyecto nunca impide comprobar los demás.

**Restricciones**
- Sin reintentos en el MVP: un fallo puntual de red puede aparecer como caído; el historial permite verlo.
- Un proyecto en un plan que se «duerme» puede aparecer degradado al despertar.
- Solo se mide la respuesta de la dirección pública: no detecta cambios de contenido ni problemas internos.

**Seguridad**
- Solo se consultan direcciones web; se limitan las redirecciones y nunca se acepta una que pase de seguro a no seguro.
- A los sitios vigilados no se les envía ninguna credencial ni cookie, solo una identificación del propio Vigía.
- Del contenido de la respuesta se lee un máximo y se descarta: no se guarda ni se muestra nada.
- Los errores se guardan como categorías cerradas, nunca como texto libre, para no filtrar nombres o direcciones internas.
- Límite conocido: no se impide consultar direcciones internas porque las direcciones las introduce el propio dueño; se vuelve obligatorio impedirlo si algún día se permite el alta desde la interfaz.

#### F3. Historial y disponibilidad
**Qué se espera**
- Se conserva el historial de 30 días.
- Se calcula la disponibilidad de las últimas 24 horas y 7 días (cuentan como disponibles las comprobaciones «funciona» y «degradado»).
- Con pocos datos se muestra «sin datos» en vez de un porcentaje.
- Lo que supera 30 días se elimina automáticamente.

**Restricciones**
- El umbral de «pocos datos» y la retención son configurables, con valores iniciales fijos.

**Seguridad**
- La eliminación solo se ejecuta como parte de los procesos programados protegidos (F8).

#### F4. Estado del último despliegue
**Qué se espera**
- Para cada proyecto se muestra el estado del último despliegue de producción (**en marcha**, **listo**, **fallido** o **desconocido**) y su fecha.
- Si la plataforma no está soportada o no responde, el estado es «desconocido» y se indica el motivo en forma de categoría; los demás proyectos no se ven afectados.

**Restricciones**
- Solo se muestra el último despliegue, sin historial de despliegues.
- La calidad del dato depende de lo que cada plataforma ofrezca.
- Un estado que la plataforma devuelva y Vigía no reconozca se trata como «desconocido».

**Seguridad**
- Se usa la credencial mínima de cada plataforma (F13) y nunca se aceptan direcciones de consulta procedentes de los datos.
- Si falta la credencial, el resultado es «desconocido» y nunca se prueba con otra credencial.

#### F5. Vulnerabilidades conocidas
**Qué se espera**
- Cada día se obtienen las alertas de seguridad de GitHub de cada repositorio y se guardan con: paquete, ecosistema, gravedad, resumen, enlace al aviso, rango afectado, versión corregida y estado.
- Las alertas nuevas se añaden, las existentes se actualizan y las que dejan de estar abiertas se marcan como resueltas.
- Cada proyecto indica el resultado de su última sincronización: correcta, alertas no activadas, sin permisos o error. Así la interfaz muestra «sin datos» y no «sin vulnerabilidades».

**Restricciones**
- Solo se muestra lo que GitHub ya ha detectado; Vigía no escanea nada.
- Que no haya alertas no significa que el proyecto sea seguro; la interfaz lo advierte.

**Seguridad**
- La credencial de GitHub solo puede leer alertas y solo de los repositorios vigilados; nunca se envía a ningún otro sitio, ni siquiera si una respuesta lo pidiera.
- Una gravedad desconocida se trata como **alta** (ante la duda no se oculta).
- Los textos que provienen de los avisos son contenido de terceros: se limitan en longitud y se muestran siempre como texto.
- Ante límites de uso de GitHub no se reintenta en bucle.

#### F6. Estado global (semáforo) y datos obsoletos
**Qué se espera**
- **Rojo**: caído o con vulnerabilidad crítica abierta. **Ámbar**: degradado, último despliegue fallido o vulnerabilidad alta abierta. **Verde**: el resto.
- Cada tarjeta muestra la antigüedad de su último dato. Si supera 3 veces la frecuencia esperada, el proyecto pasa a **gris** («sin datos recientes») y nunca cuenta como verde.

**Restricciones**
- El umbral de obsolescencia es configurable, con valor inicial.

**Seguridad**
- La obsolescencia es una medida de integridad: evita que un fallo silencioso de la ejecución periódica (F8) se interprete como «todo bien».

### B. Ejecución y mantenimiento

#### F7. Datos y su protección
**Qué se espera**
- Almacenamiento de proyectos, comprobaciones, despliegues, vulnerabilidades y estado de sincronización.
- Las escrituras las hace solo el sistema; los usuarios solo leen.

**Restricciones**
- Un único almacenamiento soportado en el MVP.

**Seguridad**
- Nadie sin sesión puede leer ni escribir.
- Un usuario con sesión pero sin segundo factor no ve ningún dato.
- Ningún usuario puede modificar datos desde la interfaz.
- Los valores permitidos de cada campo están restringidos también en el almacenamiento.
- La clave con poder de escritura solo existe en el servidor y nunca se usa en nombre de un usuario.

#### F8. Ejecución periódica protegida
**Qué se espera**
- Tres procesos programados: comprobaciones de salud (cada 5 min), estado de despliegues (cada 15 min) y vulnerabilidades más mantenimiento (diario).
- Se pueden ejecutar manualmente para comprobar la instalación.
- El monitor no depende de lo que monitoriza: el disparador de las comprobaciones frecuentes es externo.

**Restricciones**
- Si el disparador se detiene (p. ej. por inactividad del repositorio), los datos envejecen; F6 lo hace visible.
- Los procesos tienen que terminar dentro del tiempo máximo de la plataforma de ejecución.
- Los procesos son repetibles sin efectos dobles.

**Seguridad**
- Solo se ejecutan con una clave secreta larga; sin clave, o con una incorrecta, se rechazan sin dar información.
- Si el sistema no tiene configurada la clave, no arranca: nunca queda abierto.
- La respuesta es mínima (contadores): nunca nombres de proyectos ni errores.
- Si la clave se filtrara, la repetición de ejecuciones está acotada: se omiten los proyectos comprobados hace poco, se limita la concurrencia y el tiempo total.
- La clave se puede rotar y el procedimiento está documentado.

### C. Acceso y vistas

#### F9. Acceso y sesión
**Qué se espera**
- Entrada con correo y contraseña, más un segundo factor (código temporal). El segundo factor se configura en el primer acceso.
- Un único usuario, creado a mano por el propietario. Sin registro público ni cuentas anónimas.
- Cierre de sesión.

**Restricciones**
- Contraseña de al menos 12 caracteres, con letras y dígitos.
- Una sesión cerrada o revocada sigue siendo válida hasta que caduca su credencial (límite conocido).
- La comprobación de contraseñas filtradas no está disponible en el plan gratuito del almacenamiento.

**Seguridad**
- Registro y acceso anónimo desactivados en la configuración, que está escrita y es reproducible.
- Sin segundo factor no se accede a ningún dato.
- Mensajes de error genéricos: no revelan si el correo existe.
- Límite de intentos de acceso aplicado en el borde de la aplicación, además de los del proveedor de identidad.
- Tras entrar solo se redirige a rutas internas.
- Cada operación comprueba la sesión por sí misma; no se confía en una única comprobación previa.
- Las páginas con datos no se guardan en caché.

#### F10. Panel general
**Qué se espera**
- Una tarjeta por proyecto con color, tiempo de respuesta, último despliegue, vulnerabilidades por gravedad y antigüedad del dato.
- Estados claros para «sin proyectos», «error al cargar» y «con datos».

**Restricciones**
- Solo lectura.

**Seguridad**
- Todo texto que proviene de terceros se muestra como texto, nunca como contenido activo.
- Los enlaces solo se generan si son direcciones web válidas, y se abren sin compartir información del panel.

#### F11. Detalle de proyecto
**Qué se espera**
- Gráfica de tiempo de respuesta, disponibilidad 24 h/7 d, estado del último despliegue y tabla de vulnerabilidades (paquete, gravedad, versión corregida, enlace al aviso).
- Estados claros para vacío, error y datos.

**Restricciones**
- Solo lectura; solo la información de los últimos 30 días.

**Seguridad**
- Los enlaces a avisos solo se generan hacia GitHub y por conexión segura.
- La gráfica no depende de ejecutar código incrustado en la página.

### D. Plataformas y credenciales

#### F12. Plataformas de alojamiento ampliables
**Qué se espera**
- Un contrato mínimo común: dado el identificador de un proyecto, devolver estado y fecha de su último despliegue.
- Soporte inicial: Vercel y Render.
- Cualquiera puede añadir una plataforma nueva sin tocar el núcleo, con una guía paso a paso y una plantilla.
- Existe una batería de pruebas que todo conector nuevo debe superar.

**Restricciones**
- El contrato se mantiene mínimo y solo crece ante una necesidad real.
- El registro de plataformas es el único punto compartido que se modifica al añadir una.

**Seguridad**
- Cada conector recibe únicamente su propia credencial y solo habla con su propia plataforma; las pruebas fallan si intenta contactar con otro sitio o si registra la credencial.
- Los conectores de terceros son código de confianza (no hay aislamiento): se revisan con cuidado antes de aceptarlos.

#### F13. Gestión de credenciales
**Qué se espera**
- Una credencial por plataforma y por función, con el mínimo permiso posible: solo lectura de alertas y solo de repositorios vigilados en GitHub; una credencial por proyecto en Vercel; una clave dedicada en Render.
- Las credenciales caducan cuando la plataforma lo permite y existe un calendario y un procedimiento de rotación.

**Restricciones**
- Ni Vercel ni Render ofrecen credenciales de solo lectura; una fuga permitiría modificar o redesplegar.
- La clave de Render no se puede restringir con lo documentado (punto débil conocido).
- Todas las credenciales conviven en el mismo entorno: si ese entorno se compromete, se exponen todas.

**Seguridad**
- Nunca están en el repositorio ni en el almacenamiento de datos.
- Nunca aparecen en pantalla, registros ni errores.
- Nunca se envían al navegador.
- Se detecta su presencia accidental en el repositorio y en lo que se publica al navegador.

### E. Transversales

#### F14. Seguridad de la propia aplicación
**Qué se espera**
- Cabeceras y políticas de seguridad en todas las páginas: no se incrusta en otros sitios, no se ejecuta contenido no autorizado, conexión siempre segura.
- El panel no es indexable por buscadores.
- Páginas de error genéricas, sin detalles internos.
- Registro de eventos sin datos sensibles: los secretos se ocultan automáticamente.

**Restricciones**
- Las bibliotecas de terceros que se usen (p. ej. gráficas) deben ser compatibles con estas políticas.

**Seguridad**
- Esta funcionalidad es la medida en sí.

#### F15. Instalación y documentación
**Qué se espera**
- Guía de instalación (almacenamiento, claves, alta manual de proyectos, programadores), guía para añadir una plataforma y guía de contribución.
- Política de divulgación de vulnerabilidades de Vigía y plantillas de incidencias y propuestas (incluida una para conectores).
- Lista de comprobación de seguridad de la instalación (registro desactivado, segundo factor activo, alcance de credenciales, ajustes del repositorio) y guía de qué hacer si se filtra cada credencial.
- Capturas del README solo con datos ficticios.

**Restricciones**
- Documentación pública en inglés.
- La licencia debe decidirse antes de publicar el repositorio.

**Seguridad**
- Avisa de los límites conocidos (credenciales no restringibles, conectores de confianza, el panel como mapa de ataque).

#### F16. Calidad y proceso de contribución
**Qué se espera**
- Desarrollo guiado por pruebas: cada tarea empieza con la prueba que falla.
- Reglas automáticas de estilo, tipos y arquitectura (qué capas pueden depender de cuáles).
- Mensajes de commit con convención y comprobaciones automáticas antes de commit y antes de push, repetidas en integración continua (que es la barrera real).
- Cobertura mínima exigida en la lógica de negocio.

**Restricciones**
- Las comprobaciones locales se pueden saltar; por eso la integración continua repite todas.

**Seguridad**
- Detección de secretos antes de cada commit y en integración continua.
- Dependencias con versiones bloqueadas, auditadas y con ejecución de scripts de instalación restringida.
- Automatizaciones con permisos mínimos y versiones fijadas.
- Rama principal protegida y detección de secretos activada en el repositorio.

### Dónde está el detalle de implementación

| Funcionalidad | Sección de `SPEC.md` |
|---|---|
| F1 Alta de proyectos | 4 (datos), 9.3 (persistencia, sonda) |
| F2 Comprobación de salud | 5 (reglas), 6 (ejecución), 9.3 (sonda) |
| F3 Historial y disponibilidad | 4, 5, 6 |
| F4 Último despliegue | 2.4 (puerto), 5, 7.2–7.3 (Vercel/Render), 9.3 (adaptadores) |
| F5 Vulnerabilidades | 5, 7.4 (GitHub), 9.3 (GitHub) |
| F6 Semáforo y obsolescencia | 5 |
| F7 Datos y su protección | 4, 9.3 (autorización, persistencia) |
| F8 Ejecución periódica | 6, 9.3 (cron) |
| F9 Acceso y sesión | 7.1 (Supabase), 9.3 (login y sesión) |
| F10–F11 Vistas | 10 (fase 5), 9.3 (renderizado) |
| F12 Plataformas ampliables | 2.4, 2.5 |
| F13 Credenciales | 8 |
| F14 Seguridad de la aplicación | 9 |
| F15 Documentación | 10 (fase 6) |
| F16 Calidad y contribución | 3 |

---

## Parte 2. Orden de implementación

Cada paso empieza por las pruebas. Un paso no se da por terminado hasta cumplir su criterio de «hecho». Las medidas de seguridad de cada funcionalidad se construyen **en el mismo paso** que la funcionalidad, no al final.

### Paso 0. Preparación del proyecto y del repositorio
**Incluye:** entorno de desarrollo reproducible; reglas automáticas de estilo, tipos y arquitectura; marco de pruebas; estructura del proyecto; almacenamiento de datos y su configuración de acceso escrita y reproducible (sin registro, sin acceso anónimo, contraseña mínima); validación de la configuración al arrancar; comprobaciones antes de commit y antes de push; integración continua con las mismas comprobaciones, auditoría de dependencias y detección de secretos; ajustes de seguridad del repositorio; ficheros de ejemplo de configuración sin secretos. (F16, parte de F9, F13, F14)
**Hecho cuando:** un commit con un secreto de prueba es rechazado localmente y en integración continua; la integración continua pasa en un proyecto vacío; la arquitectura impide dependencias prohibidas entre capas.

### Paso 1. Reglas de negocio
**Incluye:** clasificación de salud; disponibilidad; semáforo del proyecto; obsolescencia de datos; estados de despliegue y gravedades. (F2, F3, F6 — la parte de reglas)
**Depende de:** paso 0.
**Hecho cuando:** todos los casos (respuesta rápida, lenta, no encontrada, respuesta esperada de acceso restringido, error del servidor, tiempo agotado, gravedad desconocida) tienen prueba y cobertura sobre el umbral.

### Paso 2. Procesos de aplicación con datos simulados
**Incluye:** comprobar todos los proyectos; sincronizar despliegues; sincronizar vulnerabilidades; limpiar historial; obtener datos del panel y del detalle; omisión de proyectos comprobados hace poco. (F2–F8 — lógica)
**Depende de:** paso 1.
**Hecho cuando:** los fallos individuales no detienen a los demás; los errores salen como categorías cerradas; la limpieza respeta el umbral de 30 días con un reloj simulado.

### Paso 3. Conexión con el exterior
**Incluye:** sonda de salud; conectores de Vercel y Render con su batería de pruebas común; lectura de alertas de GitHub; almacenamiento con restricciones, permisos de lectura solo para sesiones con segundo factor y pruebas de acceso; proyectos de ejemplo ficticios. (F1, F2, F4, F5, F7, F12, F13)
**Depende de:** paso 2.
**Hecho cuando:** los conectores superan la batería común y las pruebas de seguridad (no contactan con otros sitios, no registran credenciales); las pruebas de acceso al almacenamiento demuestran que sin sesión o sin segundo factor no se lee nada y que nadie escribe desde la interfaz.

### Paso 4. Ejecución periódica
**Incluye:** los tres procesos programados con su protección; las automatizaciones que los disparan, con permisos mínimos. (F8)
**Depende de:** paso 3.
**Hecho cuando:** sin clave, con clave incorrecta o con una operación no permitida se rechaza sin información; con la clave correcta se ejecutan y devuelven solo contadores; si falta la clave, el sistema no arranca.

### Paso 5. Acceso y paneles
**Incluye:** acceso con segundo factor obligatorio; protección de todas las páginas; panel general; detalle de proyecto; cabeceras y políticas de seguridad; límite de intentos de acceso en el borde. (F6, F9, F10, F11, F14)
**Depende de:** pasos 3 y 4 (para tener datos reales).
**Hecho cuando:** sin sesión se redirige a la entrada; con sesión sin segundo factor no hay datos; los textos y enlaces maliciosos de prueba se muestran como texto y no generan enlace; las pruebas de estados vacío, error y datos pasan.

### Paso 6. Documentación y política de seguridad
**Incluye:** documentación pública (instalación, plataformas, contribución); política de divulgación; lista de seguridad de la instalación y guía de rotación; plantillas; capturas con datos ficticios. (F15)
**Depende de:** paso 5.
**Hecho cuando:** una persona que no conoce el proyecto puede instalarlo siguiendo solo la guía, y la lista de seguridad se completa sin ambigüedad.

### Paso 7. Despliegue y verificación final
**Incluye:** configuración del entorno de producción; primer despliegue; ejecución manual de los tres procesos; verificación de punta a punta; revisión de seguridad completa del código; decisión de licencia antes de publicar. (F13, F15)
**Depende de:** paso 6.
**Hecho cuando:** el panel muestra datos reales, la lista de seguridad está completa, la revisión de seguridad no deja hallazgos abiertos de gravedad alta y la licencia está elegida.

---

## Parte 3. Decisiones abiertas

1. **Frecuencia de comprobación de salud:** propuesta 5 min.
2. **Disparador de las comprobaciones frecuentes:** propuesta GitHub Actions (alternativa: un servicio externo de tareas programadas).
3. **Retención del historial:** propuesta 30 días.
4. **Umbral de «datos obsoletos»:** propuesta 3 veces la frecuencia de cada proceso.
5. **Licencia:** propuesta MIT; debe decidirse antes de publicar.
6. **Pruebas de acceso al almacenamiento en integración continua:** recomendado; pendiente de confirmar (detalle en `SPEC.md`, sección 12).
