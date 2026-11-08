@AGENTS.md

# Sismos del año — convenciones del proyecto

Página pública en español (Next.js 16, App Router, TypeScript, Vercel) con los sismos fuertes del año en curso.
Todo se arma solo a partir de fuentes públicas; las correcciones manuales viven en `data/verificado.json`.

## Reglas de datos (no negociables)

- **No inventar datos.** Cada número visible sale de una fuente enlazada en la página. Si no hay dato: «Sin reportes».
- **Prioridad de víctimas** (`lib/victimas.ts`):
  1. `data/verificado.json` → se muestra su `fuente_cifras` y `fecha_cifra`. Una `nota_victimas` con cifras nulas
     también gana (sirve para «contados con el otro sismo» y evita contar dos veces).
  2. Wikipedia «List of earthquakes in {AÑO}» → rotulada «recopilación de Wikipedia, consultada el {fecha}».
  3. «Sin reportes». PAGER y GDACS se muestran aparte, rotulados como **estimación**, y nunca se suman a las
     muertes confirmadas.
- Las noticias solo muestran título, medio, fecha, enlace y miniatura. Nunca se copia el texto de una nota.

## Fuentes (`lib/fuentes/*`)

| Fuente | Archivo | Caché | Notas |
|---|---|---|---|
| USGS ComCat (base, obligatoria) | `usgs.ts` | 10 min | Si falla, la regeneración lanza error (Vercel sirve la última versión buena). |
| USGS ficha + PAGER | `usgs.ts` | 60 min | Solo para alertas ≥ amarilla. `json/alerts.json` → nivel de fatalidades. |
| GEOFON, EMSC | `catalogos.ts` | 60 min | Cotejo: \|Δt\| ≤ 90 s y ≤ 150 km (`lib/emparejar.ts`). |
| GDACS | `gdacs.ts` | 60 min | Población expuesta (MMI ≥ VII) de `geteventdata` solo para naranja/roja. |
| Wikipedia | `wikipedia.ts` | 6 h | Tablas mensuales sin hora ni coordenadas: se empareja por día UTC (±1), \|ΔM\| ≤ 0,3 y país. Celdas de víctimas con rowspan → la cifra va al sismo mayor. |
| GDELT | `noticias.ts` | 60 min | 1 petición cada 5,5 s en cola; si ya hay 2 en espera se omite. Desde algunas IP responde 429. |
| Google Noticias RSS | `noticias.ts` | 60 min | Titulares en español. |
| YouTube | `noticias.ts` | 6 h | Solo con `YOUTUBE_API_KEY`; si no, enlace de búsqueda. |
| ReliefWeb | — | — | No integrado: exige `appname` aprobado (`RELIEFWEB_APPNAME`). |

Toda petición pasa por `lib/fetcher.ts` (User-Agent descriptivo, 8 s de espera, `next.revalidate`).
Cada respuesta se valida con zod fila por fila: lo malformado se descarta sin romper la página.
Nada de código de servidor (cheerio, zod, fuentes) debe importarse desde `components/` o `lib/resumen.ts`:
las URL compartidas van en `lib/urls.ts`.

## Lógica

- `lib/datos.ts` orquesta todo (`obtenerDatos(año)`): `Promise.allSettled`, emparejamientos, menores con víctimas,
  estimaciones, placas, entorno, secuencias y estado de fuentes.
- Entorno (`lib/entorno.ts`): SUB a ≤ 250 km → Subducción; si no, clase del tramo más cercano si está a ≤ 150 km;
  > 300 km del límite y > 300 km de profundidad → Profundo; si no, corteza/intraplaca. `verificado.json` lo sobrescribe.
- Secuencias (`lib/secuencias.ts`): enlace simple a ≤ 300 km y ≤ 60 días, solo sismos ≥ `MIN_MAG`.
- Textos calculados (`lib/resumen.ts`): frase de conclusión y patrón/tendencia. La tendencia solo cambia si el
  ritmo anual sale del rango histórico (con ≥ 25 % del año transcurrido).
- Mapa: proyección en `lib/proyeccion.ts`; los trazos se precalculan en `public/mapa-rutas.json`.

## Comandos

```bash
npm run dev            # desarrollo
npm run build          # build de producción (usa data/respaldo.json si USGS falla en el primer build)
npm test               # Vitest (lógica)
npm run test:e2e       # Playwright a 390/1280 px, claro/oscuro; capturas en tests/e2e/capturas/
npm run linea-base     # regenera data/linea-base-m7.json (conteo USGS M7+ 1976–año anterior)
npm run respaldo       # regenera data/respaldo.json con los datos actuales
npm run placas         # descarga PB2002 → data/placas-pb2002.json y data/placas-mapa.json
npm run mapa           # precalcula public/mapa-rutas.json (después de placas o si cambia la proyección)
```

Si Playwright no puede descargar su navegador, exporta `PW_CHROMIUM` con la ruta de un Chromium local.
`PW_BASE_URL=https://sismos-del-anio.vercel.app` corre las pruebas e2e contra producción (sin servidor local).

Despliegue: repo `meinclaudeai-lab/sismos-del-anio` conectado a Vercel; cada push a `main` despliega.
`CRON_SECRET` y `SITE_URL` son variables sensibles de Vercel (no se pueden descargar; para cambiarlas, `vercel env rm/add`).

## Cómo corregir datos

1. Edita `data/verificado.json` → `sismos["<id USGS>"]`. Cualquier campo no nulo sobrescribe lo automático
   (`lugar`, `pais`, `muertos`, `heridos`, `nota_victimas`, `resumen`, `tsunami`, `por_que_aqui`, `entorno`,
   `fuente_cifras`, `fuente_extra`, `busqueda_noticias`).
2. Al cambiar muertos/heridos, actualiza `fuente_cifras` (nombre + URL) y `fecha_cifra` (fecha de la cifra).
3. Sismos menores sin id de USGS: clave provisional `otro-*` con `fecha_utc`, `lat`, `lon`, `magnitud_usgs` y
   `ubicacion_aprox: true`; se dibujan con borde punteado.
4. `npm test`, commit y push: Vercel vuelve a desplegar.

## Estilo

- Español en todo (código, textos, commits). Diseño sobrio: son datos de desastres con víctimas.
- Colores como tokens en `app/globals.css` (claro/oscuro por `prefers-color-scheme`). La rampa de profundidad
  es ordinal de un solo tono (validada); el rojo se reserva para «con muertes».
- Contraste AA, foco visible, todo usable con teclado (la tabla es la vía de teclado para elegir sismos),
  `aria-live` en el detalle, sin desplazamiento horizontal a 360 px.
