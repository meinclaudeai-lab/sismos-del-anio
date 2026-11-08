# Proyecto: «Sismos del año», un mapa interactivo que se actualiza solo (Next.js + Vercel)

Vas a construir y desplegar en Vercel una página pública en español. Muestra en un mapa mundial los sismos fuertes del año en curso, con sus detalles, víctimas, noticias y multimedia, y un análisis de patrones tectónicos. Todo se actualiza solo a partir de fuentes públicas. Existe un prototipo estático, hecho a mano al 10 de octubre de 2026; este proyecto lo convierte en un sitio vivo. En esta carpeta está `datos-semilla-sismos-2026.json`, con las cifras que se verificaron a mano para ese prototipo.

## Cómo quiero que trabajes

1. **Empieza en modo plan.** Lee este archivo y el JSON semilla. Prueba con `curl` cada fuente de la lista de abajo y anota qué devuelve en realidad: campos, formato, límites y si pide clave. Luego muéstrame un plan breve por fases y espera mi visto bueno.
2. **No inventes datos.** Cada número visible debe salir de una fuente que se enlaza en la página. Si una fuente no da un dato, se muestra «Sin reportes»; nunca se rellena con un valor plausible.
3. **Pregúntame antes de** crear el repositorio en GitHub, desplegar a producción, añadir cualquier servicio de pago o pedir una clave de API.
4. **Al cerrar cada fase**, corre las pruebas y revisa la página con Playwright a 390 px y a 1280 px de ancho, en modo claro y oscuro. Mira tú mismo las capturas y corrige lo que se vea mal antes de decirme que terminaste.
5. Crea un `CLAUDE.md` con las convenciones del proyecto: fuentes, prioridad de cifras, comandos y cómo corregir datos.

## Stack

- Next.js en su última versión estable (App Router, TypeScript), desplegado en Vercel.
- Mapa en SVG con `d3-geo`, `d3-zoom` y `topojson-client`. Proyección Natural Earth centrada en el Pacífico (`geoNaturalEarth1().rotate([-155, 0])`), para que el Cinturón de Fuego quede completo. Sin servicios de teselas ni claves.
- Países: paquete `world-atlas` (`countries-110m.json`). Placas: modelo PB2002, guardado como archivo estático en el repo.
- Sin base de datos en la v1. Los datos se piden en vivo con ISR (caché de Vercel), y las correcciones manuales viven en un JSON dentro del repo.
- `zod` para validar respuestas, `cheerio` para leer el HTML de Wikipedia, Vitest para la lógica y Playwright para las pruebas en navegador.

## Fuentes

Verifica cada endpoint antes de usarlo. Si alguno cambió, adáptate y avísame.

| # | Fuente | Para qué | Endpoint de partida | Refresco |
|---|---|---|---|---|
| 1 | **USGS ComCat** (obligatoria) | Catálogo base: id, hora, magnitud, lugar, coordenadas, profundidad, `tsunami`, `alert` (PAGER), `sig`, `felt`, `url` | `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime={AÑO}-01-01&minmagnitude={MIN_MAG}&orderby=time` | 10 min |
| 1b | USGS, ficha del evento | Productos `losspager`, `shakemap` y `dyfi`. PAGER es una **estimación**, no un conteo | `.../query?eventid={id}&format=geojson` | 60 min |
| 1c | USGS, conteo | Línea base histórica de sismos M7+ por año | `.../fdsnws/event/1/count?starttime=..&endtime=..&minmagnitude=7` | 30 días |
| 2 | **GEOFON (GFZ)** | Cotejo independiente de hora, ubicación y magnitud | `https://geofon.gfz.de/fdsnws/event/1/query?starttime=..&endtime=..&minmag=6&format=text` | 60 min |
| 3 | EMSC (opcional) | Segundo cotejo | `https://www.seismicportal.eu/fdsnws/event/1/query?start=..&minmag=6&format=json` | 60 min |
| 4 | **GDACS** | Alerta humanitaria (verde, naranja o roja), población expuesta y enlace al informe | `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ&fromDate=..&toDate=..` (confirma el formato en la guía rápida de la API de GDACS) | 60 min |
| 5 | **Wikipedia**, «List of earthquakes in {AÑO}» | Muertos y heridos reportados, y sismos menores que dejaron víctimas | `https://en.wikipedia.org/w/api.php?action=parse&page=List_of_earthquakes_in_{AÑO}&prop=text&format=json&formatversion=2` (lee las tablas con cheerio) | 6 h |
| 6 | ReliefWeb (opcional) | Informes de situación de OCHA | API v2. Revisa si exige un `appname` aprobado; si es así, déjala detrás de `RELIEFWEB_APPNAME` | 6 h |
| 7 | **GDELT DOC 2.0** | Noticias por sismo: título, medio, fecha, idioma y miniatura (`socialimage`) | `https://api.gdeltproject.org/api/v2/doc/doc?query=..&mode=artlist&format=json&maxrecords=10&sort=datedesc`. Tiene un límite de frecuencia (aprox. 1 petición cada 5 s): nunca la llames en paralelo | 60 min, bajo demanda |
| 8 | Google News RSS | Titulares en español | `https://news.google.com/rss/search?q=..&hl=es-419&gl=MX&ceid=MX:es-419` | 60 min, bajo demanda |
| 9 | YouTube (opcional) | Videos del sismo | Si existe `YOUTUBE_API_KEY`, usa la búsqueda de la Data API (3 videos, incrustados con carga diferida). Si no, un enlace a la búsqueda de YouTube | 6 h |
| 10 | Estáticos | Límites de placas (`PB2002_steps.json` trae `STEPCLASS` y `VELOCITYLE`) y países | `https://github.com/fraxen/tectonicplates` y `world-atlas` | — |

Reglas para estas fuentes:

- **Wikipedia/Wikimedia:** usa un `User-Agent` descriptivo con el nombre del proyecto y la URL del sitio, como pide su política. Guarda la respuesta real como fixture de pruebas. El formato de esa página cambia con el tiempo, así que el parser debe fallar con gracia y no romper la página.
- **Noticias:** muestra solo título, medio, fecha, enlace y miniatura si existe. Nunca copies el texto de las notas.

## Datos semilla y correcciones manuales

- Convierte `datos-semilla-sismos-2026.json` en `data/verificado.json`, indexado por `usgs_id`. Contiene 37 sismos con muertos, heridos, resumen, tsunami, explicación tectónica («Por qué aquí»), entorno, fuente con URL y texto de búsqueda de noticias. También trae la lista de evidencia para la sección de patrones, referencias históricas y los nombres de las placas en español.
- Esas cifras son del **10 de octubre de 2026**. Vuelve a verificar las que pudieron cambiar, sobre todo el sismo de Panamá del 9 de octubre y cualquier cifra de muertos o heridos que siguiera creciendo. Los sismos posteriores al 10 de octubre no están en la semilla; deben llegar solos desde las fuentes automáticas.
- 5 eventos tienen `usgs_id: null`. Son sismos menores con víctimas y su ubicación es aproximada. Búscales su id de USGS emparejando fecha, magnitud y zona.
- **Prioridad de las cifras de víctimas** para cada sismo:
  1. `data/verificado.json`: se muestra su fuente y la fecha de la cifra.
  2. Wikipedia: se rotula «recopilación de Wikipedia, consultada el {fecha}».
  3. Si no hay ninguna, se muestra «Sin reportes». Si hay estimación de PAGER o GDACS, se muestra aparte y rotulada como estimación.
- Las estimaciones nunca se suman a «muertes confirmadas».
- El README explica cómo añadir o corregir un sismo: se edita el JSON, se hace commit y Vercel vuelve a desplegar.

## Lógica de datos

- **Fusión:** USGS es la base. GEOFON, EMSC, GDACS y Wikipedia se emparejan por tiempo (|Δt| ≤ 90 s para catálogos, ≤ 2 min para Wikipedia) y distancia (≤ 150 km). Escribe estas funciones con pruebas.
- **Sismos menores con víctimas:** se añaden las filas de Wikipedia con muertos > 0 y magnitud < `MIN_MAG`, emparejadas con USGS. Si no se encuentra el sismo en USGS, se marca «ubicación aproximada».
- **Límite de placas más cercano:** calcula la distancia sobre la esfera a cada tramo de PB2002, con un índice por celdas para que sea rápido. Guarda el tipo de límite, el par de placas en español, la distancia en km y la velocidad relativa en mm/año.
- **Entorno tectónico**, por heurística. Cada caso se puede sobrescribir en `verificado.json`:
  - Si hay un tramo de subducción (`SUB`) a ≤ 250 km, es «Subducción». Esta regla va primero porque PB2002 a veces marca como dorsal o convergente un tramo vecino a una fosa.
  - `OTF`/`CTF` → «Falla transformante».
  - `OSR`/`CRB` → «Dorsal oceánica».
  - `OCB`/`CCB` → «Colisión y convergencia».
  - Más de 300 km del límite y más de 300 km de profundidad → «Profundo (placa hundida)».
  - Cualquier otro caso → «Fallas en la corteza / intraplaca».
- **Secuencias:** agrupa los sismos a ≤ 300 km y ≤ 60 días de distancia para detectar réplicas y secuencias. Con los datos de 2026 deberían salir Sanriku (Japón), Mindanao, Venezuela y Panamá.
- **Línea base de M7+:** el script `npm run linea-base` pide al servicio de conteo de USGS los sismos M7+ de cada año desde 1976 hasta el año anterior y guarda `data/linea-base-m7.json`. La página calcula:
  - esperado a la fecha = promedio × fracción del año transcurrida;
  - ritmo anual = conteo actual ÷ esa fracción.
  Cita también la referencia del USGS (unos 16 sismos M7+ al año en promedio).
- **Lugar en español:** traduce el `place` de USGS. Por ejemplo, «20 km W of Catia La Mar, Venezuela» pasa a «A 20 km al O de Catia La Mar, Venezuela». Traduce los rumbos y usa `Intl.DisplayNames('es')` para los países. El texto original de USGS sigue visible en la ficha.
- **«Por qué aquí» automático,** para sismos sin texto verificado. Ejemplo: «Ocurrió a 12 km de profundidad, a 3 km del límite transformante entre las placas del Caribe y Sudamericana, que se desplazan unos 20 mm al año». Lo escrito en `verificado.json` tiene prioridad.

## La página

Las secciones son las del prototipo:

1. **Encabezado:** título, una frase de conclusión armada con los datos (no un texto fijo), «Actualizado: {fecha y hora}» y el estado de cada fuente (responde / sin respuesta).
2. **Cifras clave:** sismos M≥`MIN_MAG`, sismos M7+ frente a los esperados a la fecha, muertes confirmadas y magnitud máxima con su país.
3. **Mapa:**
   - Tamaño del círculo según la magnitud; color según la profundidad (< 70, 70–300 y > 300 km).
   - Borde rojo si hubo muertes; borde punteado si la ubicación es aproximada.
   - Límites de placas con estilo propio para subducción, colisión, dorsal y transformante, con leyenda.
   - Filtros Todos / M7+ / Con muertes, botón para mostrar u ocultar los límites, y un deslizador por mes con botón para reproducir el año.
   - Zoom con botones y con pellizco. Información al pasar el cursor en escritorio. En móvil, un toque selecciona el sismo, con un área de toque de al menos 24 px.
   - El mapa no debe atrapar el desplazamiento vertical de la página en móvil.
4. **Detalle del sismo seleccionado:**
   - Magnitud, lugar, país, fecha y hora (en UTC y en la hora local del lector), profundidad, muertos, heridos, magnitud según GEOFON, tsunami y alerta de PAGER/GDACS.
   - «Qué pasó», «Por qué aquí», el límite de placas más cercano y la fuente de cada cifra.
   - **Noticias y multimedia:** titulares que se cargan bajo demanda desde `/api/noticias/[id]`, videos, fotos (miniaturas de GDELT y un enlace a búsqueda de imágenes), ficha del USGS e informe de GDACS.
   - Cada sismo tiene una URL para compartir (`?sismo={id}`).
5. **Tabla de todos los sismos:** ordenable y sujeta a los filtros del mapa. Al tocar una fila se abre el detalle. Las columnas secundarias se ocultan en pantallas angostas.
6. **«¿Hay un patrón o una tendencia?»:** texto con cifras calculadas y estas gráficas:
   - Serie anual de M7+ desde 1976, con el año actual y su proyección.
   - Sismos por entorno tectónico.
   - Profundidad frente a magnitud (tamaño del punto = muertes).
   - Sismos por mes.
   Debajo va la lista de secuencias detectadas. El mensaje central, con la evidencia de la semilla, es que hay un patrón (los sismos se concentran en los límites de placas), pero no una tendencia global nueva. Que el texto cambie solo si un año sale de verdad del rango histórico.
7. **«Qué dicen las fuentes»:** tarjetas de evidencia con enlaces, tomadas de la semilla.
8. **«Cómo se arma»:** método, umbrales, limitaciones, licencias y atribuciones (USGS, GFZ/GEOFON, EMSC, GDACS, Wikipedia CC BY-SA, PB2002 de Bird (2003), Natural Earth, GDELT).

Requisitos generales:

- Todo en español.
- Modo claro u oscuro según el sistema.
- Contraste AA, foco visible, uso completo con teclado y `aria-live` en el panel de detalle.
- Sin desplazamiento horizontal a 360 px.
- Diseño sobrio: los datos son de desastres con víctimas.

## Actualización automática

- **Página:** usa ISR con `revalidate = 900` (configurable). Cada fuente lleva su propio tiempo de caché, el de la tabla de fuentes.
- **`/api/noticias/[id]`:** route handler con `Cache-Control: s-maxage=3600, stale-while-revalidate=86400`. Encola las peticiones a GDELT.
- **`/api/sismos`:** devuelve en JSON los datos ya combinados, para depurar y para reutilizarlos.
- **Año en curso automático:** el 1 de enero la página pasa sola al año nuevo. Si es sencillo, `?año=2026` deja consultar años anteriores.
- **Cron de Vercel opcional:** en `vercel.json`, una llamada diaria a `/api/cron/refresh` que ejecuta `revalidatePath('/')`. Protégela con `CRON_SECRET`; Vercel envía el encabezado `Authorization: Bearer <CRON_SECRET>`. Revisa los límites actuales del plan Hobby antes de elegir la frecuencia.

## Resiliencia

- Cada fuente tiene un tiempo de espera de 8 s, y todas se piden con `Promise.allSettled`.
- Si USGS falla durante una regeneración, lanza un error para que Vercel siga sirviendo la última versión buena. Si todavía no existe ninguna, usa `data/respaldo.json`, que genera `npm run respaldo`.
- Si falla una fuente secundaria, la página se arma igual y lo indica en el estado de fuentes.
- Valida todo con zod. Descarta las filas malformadas sin romper la página.

## Pruebas

- **Unitarias:**
  - Emparejamiento por tiempo y distancia.
  - Distancia al límite de placas.
  - Heurística de entorno.
  - Parser de Wikipedia, con fixture.
  - Traducción del lugar.
  - Prioridad de cifras.
  - Cálculo del esperado y del ritmo anual.
  - Detección de secuencias.
- **Playwright:** carga de la página, filtros, selección de un sismo, enlace para compartir y ausencia de desplazamiento horizontal a 390 px, con capturas en claro y oscuro. Mira tú las capturas.
- Si es viable, que Lighthouse móvil dé 90 o más en rendimiento y accesibilidad.

## Despliegue

- Usa git con commits pequeños y descriptivos.
- Para Vercel, el repo se importa desde GitHub o con la CLI de `vercel`. Yo inicio sesión cuando me lo pidas.
- Variables de entorno: `MIN_MAG` (por defecto 6.5), `SITE_URL`, `CRON_SECRET`, y las opcionales `YOUTUBE_API_KEY` y `RELIEFWEB_APPNAME`. Ninguna clave de API debe ser obligatoria.
- El README cubre: cómo correrlo en local, las variables, cómo corregir cifras, cómo funcionan las actualizaciones, y las fuentes y licencias.

## Criterios de aceptación

- La página desplegada muestra los sismos del año en curso hasta hoy, sin intervención manual.
- Un sismo nuevo M≥`MIN_MAG` aparece a lo sumo 30 minutos después de que USGS lo publique (en la siguiente visita).
- Cada cifra visible tiene su fuente enlazada, y las estimaciones están rotuladas como tales.
- El análisis de patrones y la frase de conclusión se recalculan solos.
- Se usa bien en móvil.
- Si una fuente secundaria cae, la página sigue funcionando y lo indica.
