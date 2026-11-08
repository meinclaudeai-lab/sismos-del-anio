import * as cheerio from "cheerio";
import { z } from "zod";
import { CACHE } from "../config";
import { pedirJSON } from "../fetcher";
import type { FilaWikipedia } from "../tipos";

export { urlPaginaWikipedia } from "../urls";
export const urlApiWikipedia = (anio: number) =>
  `https://en.wikipedia.org/w/api.php?action=parse&page=List_of_earthquakes_in_${anio}&prop=text&format=json&formatversion=2`;

const MESES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "5,069", "≥100", "100+" → número; "-", "", "Unknown" → null. */
export function numeroWiki(t: string): number | null {
  const m = t.replace(/[,\s]/g, "").match(/\d+/);
  return m ? Number(m[0]) : null;
}

type Celda = { texto: string; ancla: number };

/** Convierte una tabla HTML en una matriz de celdas, resolviendo rowspan/colspan. `ancla` = fila donde nace la celda. */
function matriz($: cheerio.CheerioAPI, tabla: cheerio.Cheerio<never>): Celda[][] {
  const filas: Celda[][] = [];
  const pendientes: { col: number; resto: number; celda: Celda }[] = [];
  tabla.find("tr").each((_, tr) => {
    const celdas = $(tr).children("td");
    if (celdas.length === 0) return; // encabezados
    const i = filas.length;
    const fila: Celda[] = [];
    let col = 0;
    const colocarPendientes = () => {
      let p;
      while ((p = pendientes.find((x) => x.col === col && x.resto > 0))) {
        fila[col] = p.celda;
        p.resto--;
        col++;
      }
    };
    celdas.each((_, td) => {
      colocarPendientes();
      const celda = { texto: $(td).text().replace(/\s+/g, " ").trim(), ancla: i };
      const rs = Number($(td).attr("rowspan") ?? 1);
      const cs = Number($(td).attr("colspan") ?? 1);
      for (let k = 0; k < cs; k++) {
        fila[col] = celda;
        if (rs > 1) pendientes.push({ col, resto: rs - 1, celda });
        col++;
      }
    });
    colocarPendientes();
    for (let k = pendientes.length - 1; k >= 0; k--) if (pendientes[k].resto <= 0) pendientes.splice(k, 1);
    filas.push(fila);
  });
  return filas;
}

/**
 * Lee las tablas mensuales (Date | Country and location | M | Depth | MMI | Notes | Dead | Injured).
 * Falla con gracia: si el formato cambia, devuelve las filas que sí entiende (o ninguna).
 */
export function parsearWikipedia(html: string, anio: number): FilaWikipedia[] {
  const $ = cheerio.load(html);
  $("sup.reference, style, .mw-editsection").remove();
  const out: FilaWikipedia[] = [];
  $("table.wikitable").each((_, t) => {
    const tabla = $(t) as cheerio.Cheerio<never>;
    const titulo = tabla.prevAll(".mw-heading").first().find("h2,h3").first().text().trim();
    const mes = MESES.indexOf(titulo);
    if (mes < 0) return;
    const encabezado = tabla.find("tr").first().text().toLowerCase();
    if (!encabezado.includes("date") || !encabezado.includes("casualties")) return;
    const m = matriz($, tabla);
    const filasTabla: (FilaWikipedia & { ancla: number; i: number })[] = [];
    m.forEach((celdas, i) => {
      const c = celdas.map((x) => x?.texto ?? "");
      if (c.length < 8) return;
      const dia = numeroWiki(c[0]);
      const mag = Number.parseFloat(c[2]);
      if (!dia || dia > 31 || !Number.isFinite(mag)) return;
      const lugar = c[1];
      const prof = Number.parseFloat(c[3]);
      filasTabla.push({
        fecha: `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`,
        lugar,
        pais: lugar.split(",")[0].trim(),
        mag,
        profundidadKm: Number.isFinite(prof) ? prof : null,
        muertos: numeroWiki(c[6]),
        heridos: numeroWiki(c[7]),
        compartida: false,
        ancla: celdas[6]?.ancla ?? i,
        i,
      });
    });
    // Víctimas en una celda con rowspan (p. ej. dos sismos el mismo día): la cifra conjunta
    // se asigna solo al de mayor magnitud; los demás quedan sin cifra y marcados como compartidos.
    const grupos = new Map<number, typeof filasTabla>();
    for (const f of filasTabla) grupos.set(f.ancla, [...(grupos.get(f.ancla) ?? []), f]);
    for (const g of grupos.values()) {
      if (g.length < 2) continue;
      const mayor = g.reduce((a, b) => (b.mag > a.mag ? b : a));
      for (const f of g) {
        f.compartida = true;
        if (f !== mayor) {
          f.muertos = null;
          f.heridos = null;
        }
      }
    }
    for (const f of filasTabla)
      out.push({ fecha: f.fecha, lugar: f.lugar, pais: f.pais, mag: f.mag, profundidadKm: f.profundidadKm, muertos: f.muertos, heridos: f.heridos, compartida: f.compartida });
  });
  return out;
}

const Respuesta = z.object({ parse: z.object({ text: z.string() }) });

export async function filasWikipedia(anio: number): Promise<FilaWikipedia[]> {
  const json = await pedirJSON("Wikipedia", urlApiWikipedia(anio), CACHE.wikipedia);
  return parsearWikipedia(Respuesta.parse(json).parse.text, anio);
}
