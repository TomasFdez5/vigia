# Vigía

> Documento de producto. Explica **qué es Vigía y para qué sirve**, sin entrar en cómo se construye.
> Está en español por ser documentación de trabajo; el producto final (interfaz, documentación pública y código) será en inglés.

## Qué es

Vigía es un panel privado, de código abierto, para vigilar de un vistazo los proyectos web que ya tienes publicados. Para cada uno responde a tres preguntas:

1. **¿Está funcionando ahora mismo, y con qué rapidez responde?**
2. **¿Cómo fue su último despliegue, y cuándo?**
3. **¿Tiene vulnerabilidades de seguridad conocidas sin resolver?**

Todo se resume en una tarjeta por proyecto con un color (verde, ámbar o rojo), de modo que en pocos segundos sabes si algo necesita tu atención.

## Para quién es

Para personas que mantienen varios proyectos propios (desarrolladores independientes, pequeños equipos, proyectos personales) y quieren un único sitio donde mirar, sin contratar un servicio de monitorización de pago ni montar una infraestructura compleja.

Cada persona tiene **su propia instancia de Vigía**, con sus propios datos. No es un servicio compartido ni una cuenta en la nube de nadie: es tuyo.

## El problema que resuelve

Cuando tienes varios proyectos, lo habitual es enterarte de que algo falla porque alguien te avisa. Además, la información está repartida: el estado del despliegue vive en la plataforma donde alojas cada proyecto, las alertas de seguridad en GitHub, y si el sitio responde o no, en ninguna parte a menos que lo compruebes a mano.

Vigía junta esas tres cosas en una sola vista, siempre actualizada.

## Qué hace

### Comprueba que tus proyectos responden

Cada pocos minutos Vigía visita la dirección de cada proyecto y anota si respondió, cuánto tardó y qué código devolvió. Con eso clasifica cada comprobación:

- **Funciona**: responde correctamente y con rapidez.
- **Degradado**: responde, pero despacio o con un resultado que no es el esperado.
- **Caído**: no responde, se agota el tiempo de espera o devuelve un error del servidor.

Puedes indicar, proyecto a proyecto, qué página comprobar y qué respuestas considerar normales. Por ejemplo, una página que exige iniciar sesión puede responder con una negativa y aun así estar perfectamente sana.

### Guarda el historial

Vigía conserva las comprobaciones de los últimos 30 días y calcula el **porcentaje de disponibilidad** de las últimas 24 horas y de los últimos 7 días. Si todavía no hay suficientes comprobaciones para que el porcentaje sea fiable, lo dice (“sin datos”) en lugar de enseñar un número engañoso.

### Muestra el último despliegue

Para cada proyecto indica si el último despliegue está en marcha, terminó bien o falló, y cuándo ocurrió. Esta información la obtiene de la plataforma donde está alojado el proyecto. Al empezar, Vigía entiende dos plataformas: **Vercel** y **Render**.

### Enseña las vulnerabilidades abiertas

Muestra las alertas de seguridad que GitHub ha detectado en las dependencias de cada proyecto (las que genera su función Dependabot): qué paquete está afectado, qué gravedad tiene, en qué versión se corrige y un enlace al aviso original.

### Te da un semáforo por proyecto

- **Rojo**: el proyecto está caído, o tiene una vulnerabilidad crítica abierta.
- **Ámbar**: está degradado, su último despliegue falló, o tiene una vulnerabilidad de gravedad alta abierta.
- **Verde**: nada de lo anterior.
- **Gris**: los datos son demasiado antiguos para fiarse. Esto avisa de que algo ha dejado de actualizarse, y un proyecto en gris **nunca** se muestra como verde.

## Qué verás

**Vista general.** Una tarjeta por proyecto con su color, su tiempo de respuesta, su último despliegue y el número de vulnerabilidades por gravedad. Cada tarjeta indica también cuánto hace de la última información.

**Detalle de un proyecto.** Una gráfica del tiempo de respuesta, la disponibilidad, el estado del despliegue y la tabla completa de vulnerabilidades.

## Cómo es el día a día

Casi no haces nada. Vigía trabaja solo en segundo plano; tú abres el panel cuando quieres comprobar cómo van las cosas, o cuando sospechas que algo falla. Si una tarjeta está en verde, sigues con lo tuyo. Si no, entras en el detalle y ves qué ocurre y desde cuándo.

Los proyectos que vigila se dan de alta una vez, a mano, indicando su dirección, su plataforma de alojamiento y su repositorio en GitHub.

## Principios

- **Privado y de una sola persona.** Cada instalación tiene un único usuario. No hay registro público ni cuentas anónimas. Para entrar hace falta contraseña y un segundo factor de verificación, porque el panel reúne información delicada (qué proyectos tienes y qué vulnerabilidades abiertas tienen).
- **Honesto con lo que no sabe.** Si no puede obtener un dato, lo dice. Que un proyecto aparezca “sin datos” o “sin alertas” no significa que esté a salvo; el panel lo deja claro. Prefiere un gris sincero a un verde dudoso.
- **Seguro por defecto.** Las claves que Vigía necesita para consultar tus plataformas se limitan a lo mínimo imprescindible, nunca se muestran en pantalla ni se guardan en registros, y la información de terceros se trata siempre como no fiable.
- **Sin sorpresas.** Vigía solo mira: no modifica tus proyectos, no despliega nada y no escanea activamente tus sitios.
- **Abierto y ampliable.** Cualquiera puede aportar soporte para una plataforma de alojamiento nueva sin tocar el núcleo del producto.

## Qué necesitas para usarlo

- Proyectos web propios, con dirección pública, de los que seas dueño.
- Cuenta en la plataforma donde están alojados (Vercel o Render).
- Los proyectos en GitHub con las alertas de dependencias activadas, si quieres ver vulnerabilidades.
- Tu propia instalación de Vigía y su almacenamiento de datos. La guía de instalación te lleva paso a paso.

## Lo que Vigía no hace (todavía)

- **No envía avisos** por correo, Telegram u otros canales: hay que abrir el panel.
- **No revisa** certificados, dominios ni cabeceras de seguridad de tus sitios.
- **No muestra** registros de errores ni métricas de visitas.
- **No permite alta de proyectos desde la interfaz**: se hace a mano. Tampoco los descubre automáticamente.
- **No analiza** tu código en busca de vulnerabilidades: solo muestra lo que GitHub ya ha detectado.
- **No detecta** si el contenido de tu sitio ha cambiado, solo si responde.

## Limitaciones que conviene conocer

- Una sola comprobación fallida puede deberse a un problema puntual de red. Para ayudarte a distinguirlo, Vigía guarda el historial en lugar de dar el último resultado como definitivo.
- Los proyectos alojados en planes gratuitos que se “duermen” por inactividad pueden parecer lentos justo al despertar.
- La información de despliegues depende de lo que cada plataforma ofrece.
- Si el programador automático que lanza las comprobaciones deja de funcionar, las tarjetas pasan a gris para avisarte.
