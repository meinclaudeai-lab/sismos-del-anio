# Sismos del año

Mapa interactivo, en español, de los sismos fuertes del año en curso: dónde ocurrieron, cuántas víctimas dejaron,
qué dicen las noticias y si hay un patrón o una tendencia. Se actualiza solo a partir de fuentes públicas
(USGS, GEOFON, EMSC, GDACS, Wikipedia, GDELT y Google Noticias) y no necesita ninguna clave de API.

En línea: <https://sismos-del-anio.vercel.app>

## Correr en local

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev        # http://localhost:3000
```

Otros comandos:

```bash
npm test           # pruebas de la lógica (Vitest)
npm run build && npm run test:e2e   # pruebas en navegador (Playwright), capturas en tests/e2e/capturas/
PW_BASE_URL=https://sismos-del-anio.vercel.app npm run test:e2e   # las mismas pruebas contra producción
```

`?año=2025` muestra un año anterior (desde 1976) y `?sismo=<id de USGS>` abre un sismo concreto.
`/api/sismos` devuelve los datos combinados en JSON.

## Variables de entorno

| Variable | Obligatoria | Para qué |
|---|---|---|
| `MIN_MAG` | No (6.5) | Magnitud mínima del catálogo. Los sismos menores con muertos se añaden igual. |
| `SITE_URL` | No | URL pública; va en el User-Agent que se envía a Wikipedia y en los metadatos. |
| `CRON_SECRET` | Para el cron | Protege `/api/cron/refresh`. Vercel lo envía como `Authorization: Bearer …`. |
| `YOUTUBE_API_KEY` | No | Incrusta 3 videos por sismo. Sin ella, se muestra un enlace de búsqueda. |
| `RELIEFWEB_APPNAME` | No | Reservada: ReliefWeb exige un `appname` aprobado; aún no se integra. |

## Cómo se actualiza

- **Página:** ISR. Se regenera como máximo cada 10–15 minutos, en la siguiente visita. USGS se consulta cada
  10 min, GEOFON/EMSC/GDACS cada hora y Wikipedia cada 6 h.
- **Si USGS falla** durante una regeneración, Vercel sigue sirviendo la última versión buena. En el primer build
  se usa `data/respaldo.json` (regenéralo con `npm run respaldo`).
- **Si falla otra fuente**, la página se arma igual y lo indica en «estado de las fuentes».
- **Noticias:** `/api/noticias/[id]` se pide al abrir un sismo, con caché de 1 h en la CDN.
- **Cron:** `vercel.json` llama a diario a `/api/cron/refresh` (el plan Hobby permite un cron al día).
- **Año nuevo:** el 1 de enero la página pasa sola al año siguiente.
- **Línea base M7+:** cada año, corre `npm run linea-base` y haz commit de `data/linea-base-m7.json`.

## Cómo añadir o corregir un sismo

1. Abre `data/verificado.json`. Cada sismo está bajo su id de USGS (lo ves en la URL `?sismo=` o en la ficha del USGS).
2. Cambia o añade los campos que necesites. Si cambias muertos o heridos, pon también la fuente y la fecha de la cifra:

   ```json
   "us6000u18k": {
     "muertos": 1,
     "heridos": 27,
     "fecha_cifra": "2026-10-18",
     "fuente_cifras": { "nombre": "OPS/OMS, Informe de situación n.º 3", "url": "https://www.paho.org/…" },
     "resumen": "…",
     "por_que_aqui": "…"
   }
   ```

   Los campos en `null` dejan el valor automático. Una `nota_victimas` sin cifras sirve para indicar, por ejemplo,
   que las víctimas se contaron con otro sismo.
3. Corre `npm test`, haz commit y push. Vercel vuelve a desplegar y la cifra aparece con su fuente.

**Orden de prioridad de las cifras de víctimas:** primero `verificado.json`, después Wikipedia (rotulada con su fecha
de consulta) y, si no hay ninguna, «Sin reportes». Las estimaciones de PAGER y GDACS se muestran aparte y nunca se
suman a las muertes confirmadas.

## Fuentes y licencias

- **USGS ComCat**, PAGER, ShakeMap, servicio de conteo: dominio público (EE. UU.).
- **GEOFON (GFZ Potsdam)** y **EMSC**: catálogos de cotejo, con atribución.
- **GDACS** (Comisión Europea / ONU): alertas humanitarias y población expuesta.
- **Wikipedia**, «List of earthquakes in {año}»: CC BY-SA 4.0. Se citan solo cifras, con enlace y fecha de consulta.
- **PB2002**, Bird, P. (2003), *An updated digital model of plate boundaries*, G³, doi:10.1029/2001GC000252,
  vía [fraxen/tectonicplates](https://github.com/fraxen/tectonicplates) (ODC-BY).
- **Natural Earth** (dominio público) vía el paquete `world-atlas`.
- **GDELT** y **Google Noticias**: solo título, medio, fecha, enlace y miniatura. El feed RSS de Google Noticias se
  ofrece para uso personal y no comercial; revisa sus condiciones si el sitio pasa a tener fines comerciales.

Estructura y convenciones del código: ver [CLAUDE.md](CLAUDE.md).
