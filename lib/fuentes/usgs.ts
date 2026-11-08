import { z } from "zod";
import { CACHE } from "../config";
import { pedirJSON, pedirTexto } from "../fetcher";
import type { Estimacion, EventoUSGS } from "../tipos";

export const BASE_USGS = "https://earthquake.usgs.gov/fdsnws/event/1";

const Feature = z.object({
  id: z.string(),
  properties: z.object({
    mag: z.number(),
    place: z.string().nullable(),
    time: z.number(),
    url: z.string(),
    felt: z.number().nullable(),
    alert: z.string().nullable(),
    tsunami: z.number(),
    sig: z.number(),
    magType: z.string().nullable(),
    type: z.string(),
  }),
  geometry: z.object({ coordinates: z.tuple([z.number(), z.number(), z.number()]).rest(z.number()) }),
});

/** Valida cada fila por separado: las malformadas se descartan sin romper el resto. */
export function parsearUSGS(json: unknown): EventoUSGS[] {
  const features = z.object({ features: z.array(z.unknown()) }).parse(json).features;
  const out: EventoUSGS[] = [];
  for (const f of features) {
    const r = Feature.safeParse(f);
    if (!r.success || r.data.properties.type !== "earthquake") continue;
    const { id, properties: p, geometry: g } = r.data;
    out.push({
      id,
      tiempo: p.time,
      lon: g.coordinates[0],
      lat: g.coordinates[1],
      profundidadKm: g.coordinates[2],
      mag: p.mag,
      magTipo: p.magType ?? "",
      lugar: p.place ?? "",
      url: p.url,
      tsunami: p.tsunami === 1,
      alerta: p.alert,
      sig: p.sig,
      felt: p.felt,
    });
  }
  return out;
}

export function urlCatalogoUSGS(anio: number, minMag: number) {
  return `${BASE_USGS}/query?format=geojson&starttime=${anio}-01-01&endtime=${anio + 1}-01-01&minmagnitude=${minMag}&orderby=time`;
}

export async function catalogoUSGS(anio: number, minMag: number): Promise<EventoUSGS[]> {
  return parsearUSGS(await pedirJSON("USGS", urlCatalogoUSGS(anio, minMag), CACHE.usgs));
}

/** Sismos de un día (para emparejar filas de Wikipedia de sismos menores). */
export async function usgsDelDia(fecha: string, minMag: number): Promise<EventoUSGS[]> {
  const d = new Date(`${fecha}T00:00:00Z`);
  const ini = new Date(d.getTime() - 86400000).toISOString().slice(0, 10);
  const fin = new Date(d.getTime() + 2 * 86400000).toISOString().slice(0, 10);
  const url = `${BASE_USGS}/query?format=geojson&starttime=${ini}&endtime=${fin}&minmagnitude=${minMag}`;
  return parsearUSGS(await pedirJSON("USGS", url, CACHE.wikipedia));
}

export async function conteoUSGS(inicio: string, fin: string, minMag: number): Promise<number> {
  const url = `${BASE_USGS}/count?starttime=${inicio}&endtime=${fin}&minmagnitude=${minMag}`;
  const t = await pedirTexto("USGS conteo", url, CACHE.usgsConteo);
  const n = Number(t.trim());
  if (!Number.isFinite(n)) throw new Error(`conteo inválido: ${t.slice(0, 40)}`);
  return n;
}

const COLOR_ES: Record<string, string> = { green: "verde", yellow: "amarilla", orange: "naranja", red: "roja" };
const RANGO_PAGER: Record<string, string> = {
  green: "menos de 1 muerte estimada",
  yellow: "entre 1 y 99 muertes estimadas",
  orange: "entre 100 y 999 muertes estimadas",
  red: "1000 o más muertes estimadas",
};

const Detalle = z.object({
  properties: z.object({
    products: z.object({
      losspager: z
        .array(z.object({ contents: z.record(z.string(), z.object({ url: z.string() })) }))
        .optional(),
    }),
  }),
});
const Alertas = z.object({ fatality: z.object({ level: z.string() }) });

/** Estimación de muertes de PAGER (nivel de alerta de fatalidades). Solo se pide para alertas ≥ amarilla. */
export async function estimacionPAGER(id: string, urlEvento: string): Promise<Estimacion | null> {
  const det = Detalle.parse(
    await pedirJSON("USGS ficha", `${BASE_USGS}/query?eventid=${id}&format=geojson`, CACHE.usgsDetalle),
  );
  const pager = det.properties.products.losspager?.[0];
  const urlAlertas = pager?.contents["json/alerts.json"]?.url;
  if (!urlAlertas) return null;
  const { fatality } = Alertas.parse(await pedirJSON("USGS PAGER", urlAlertas, CACHE.usgsDetalle));
  return {
    fuente: "PAGER",
    nivel: COLOR_ES[fatality.level] ?? fatality.level,
    texto: `Alerta ${COLOR_ES[fatality.level] ?? fatality.level} de PAGER por víctimas: ${RANGO_PAGER[fatality.level] ?? "sin rango"}`,
    url: `${urlEvento}/pager`,
  };
}
