import { z } from "zod";
import { CACHE } from "../config";
import { pedirJSON, pedirTexto } from "../fetcher";
import type { EventoCatalogo } from "../tipos";

export function urlGEOFON(anio: number, minMag: number) {
  return `https://geofon.gfz.de/fdsnws/event/1/query?starttime=${anio}-01-01&endtime=${anio + 1}-01-01&minmag=${minMag}&format=text`;
}
export const urlEventoGEOFON = (id: string) => `https://geofon.gfz.de/eqinfo/event.php?id=${id}`;

/** Formato FDSN texto: #EventID|Time|Latitude|Longitude|Depth/km|Author|Catalog|Contributor|ContributorID|MagType|Magnitude|MagAuthor|EventLocationName|EventType */
export function parsearGEOFON(texto: string): EventoCatalogo[] {
  const out: EventoCatalogo[] = [];
  for (const linea of texto.split("\n")) {
    if (!linea.trim() || linea.startsWith("#")) continue;
    const c = linea.split("|");
    if (c.length < 13) continue;
    const t = Date.parse(c[1].endsWith("Z") ? c[1] : `${c[1]}Z`);
    const ev = {
      id: c[0],
      tiempo: t,
      lat: Number(c[2]),
      lon: Number(c[3]),
      profundidadKm: Number(c[4]),
      magTipo: c[9],
      mag: Number(c[10]),
      lugar: c[12],
    };
    if ([ev.tiempo, ev.lat, ev.lon, ev.mag].every(Number.isFinite)) out.push(ev);
  }
  return out;
}

export async function catalogoGEOFON(anio: number, minMag: number) {
  return parsearGEOFON(await pedirTexto("GEOFON", urlGEOFON(anio, minMag), CACHE.geofon));
}

export function urlEMSC(anio: number, minMag: number) {
  return `https://www.seismicportal.eu/fdsnws/event/1/query?start=${anio}-01-01&end=${anio + 1}-01-01&minmag=${minMag}&format=json&limit=1000`;
}
export const urlEventoEMSC = (id: string) => `https://www.seismicportal.eu/eventdetails.html?unid=${id}`;

const FilaEMSC = z.object({
  id: z.string(),
  properties: z.object({
    time: z.string(),
    lat: z.number(),
    lon: z.number(),
    depth: z.number(),
    mag: z.number(),
    magtype: z.string().nullish(),
    flynn_region: z.string().nullish(),
  }),
});

export function parsearEMSC(json: unknown): EventoCatalogo[] {
  const features = z.object({ features: z.array(z.unknown()) }).parse(json).features;
  const out: EventoCatalogo[] = [];
  for (const f of features) {
    const r = FilaEMSC.safeParse(f);
    if (!r.success) continue;
    const p = r.data.properties;
    out.push({
      id: r.data.id,
      tiempo: Date.parse(p.time),
      lat: p.lat,
      lon: p.lon,
      profundidadKm: p.depth,
      mag: p.mag,
      magTipo: p.magtype ?? "",
      lugar: p.flynn_region ?? "",
    });
  }
  return out;
}

export async function catalogoEMSC(anio: number, minMag: number) {
  return parsearEMSC(await pedirJSON("EMSC", urlEMSC(anio, minMag), CACHE.emsc));
}
