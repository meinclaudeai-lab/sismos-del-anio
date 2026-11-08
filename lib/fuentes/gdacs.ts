import { z } from "zod";
import { CACHE } from "../config";
import { pedirJSON } from "../fetcher";
import type { EventoGDACS } from "../tipos";

export function urlGDACS(anio: number) {
  const hoy = new Date().toISOString().slice(0, 10);
  const fin = `${anio}-12-31` < hoy ? `${anio}-12-31` : hoy;
  return `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ&fromDate=${anio}-01-01&toDate=${fin}`;
}

const Fila = z.object({
  geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
  properties: z.object({
    eventid: z.number(),
    alertlevel: z.string(),
    country: z.string().nullish(),
    fromdate: z.string(),
    url: z.object({ report: z.string(), details: z.string() }),
    severitydata: z.object({ severity: z.number() }),
  }),
});

export function parsearGDACS(json: unknown): EventoGDACS[] {
  const features = z.object({ features: z.array(z.unknown()) }).parse(json).features;
  const out: EventoGDACS[] = [];
  for (const f of features) {
    const r = Fila.safeParse(f);
    if (!r.success) continue;
    const p = r.data.properties;
    out.push({
      eventid: p.eventid,
      tiempo: Date.parse(`${p.fromdate}Z`),
      lon: r.data.geometry.coordinates[0],
      lat: r.data.geometry.coordinates[1],
      mag: p.severitydata.severity,
      alerta: p.alertlevel,
      pais: p.country ?? "",
      url: p.url.report,
      detalles: p.url.details,
    });
  }
  return out;
}

export async function eventosGDACS(anio: number) {
  return parsearGDACS(await pedirJSON("GDACS", urlGDACS(anio), CACHE.gdacs));
}

const Detalle = z.object({
  properties: z.object({
    earthquakedetails: z.object({ shakepopdescription: z.string().nullish() }).nullish(),
  }),
});

/** Población expuesta a intensidad ≥ VII según GDACS, p. ej. "10 thousand (in MMI>=VII)". */
export async function poblacionGDACS(urlDetalles: string): Promise<string | null> {
  const d = Detalle.parse(await pedirJSON("GDACS detalle", urlDetalles, CACHE.gdacs));
  const t = d.properties.earthquakedetails?.shakepopdescription;
  return t ? traducirPoblacion(t) : null;
}

export function traducirPoblacion(t: string): string {
  return t
    .replace(/\(in MMI>=VII\)/i, "expuestas a intensidad VII o mayor")
    .replace(/\bthousand\b/i, "mil")
    .replace(/\bmillion\b/i, "millones")
    .replace(/^No people/i, "Nadie")
    .trim()
    .replace(/^(\d[\d.,]*) (mil|millones)/, "$1 $2 personas")
    .replace(/^(\d[\d.,]*) expuestas/, "$1 personas expuestas");
}

export const NIVEL_GDACS_ES: Record<string, string> = { Green: "verde", Orange: "naranja", Red: "roja" };
