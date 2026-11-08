import * as cheerio from "cheerio";
import { z } from "zod";
import { CACHE, USER_AGENT } from "../config";
import { pedir } from "../fetcher";

export type Nota = {
  titulo: string;
  medio: string;
  fecha: string | null;
  url: string;
  idioma: string | null;
  imagen: string | null;
  origen: "GDELT" | "Google Noticias";
};

// ---------- GDELT: máximo una petición cada 5 s, nunca en paralelo ----------
const ESPERA_GDELT_MS = 5500;
let colaGDELT: Promise<unknown> = Promise.resolve();
let ultimaGDELT = 0;
let pendientesGDELT = 0;
/** Más de esto en espera y la petición se omite: la cola no debe crecer sin límite. */
export const MAX_PENDIENTES_GDELT = 2;

/** Encola una tarea para que las llamadas a GDELT queden en serie y espaciadas. */
export function enColaGDELT<T>(tarea: () => Promise<T>): Promise<T> {
  if (pendientesGDELT >= MAX_PENDIENTES_GDELT) return Promise.reject(new Error("GDELT ocupado"));
  pendientesGDELT++;
  const r = colaGDELT.then(async () => {
    const espera = ultimaGDELT + ESPERA_GDELT_MS - Date.now();
    if (espera > 0) await new Promise((ok) => setTimeout(ok, espera));
    ultimaGDELT = Date.now();
    try {
      return await tarea();
    } finally {
      pendientesGDELT--;
    }
  });
  colaGDELT = r.catch(() => undefined);
  return r;
}

const ArticuloGDELT = z.object({
  url: z.string(),
  title: z.string(),
  seendate: z.string().nullish(),
  socialimage: z.string().nullish(),
  domain: z.string().nullish(),
  language: z.string().nullish(),
});

const fechaGDELT = (t: number) => new Date(t).toISOString().replace(/[-:T]/g, "").slice(0, 14);

export function urlGDELT(consulta: string, desde: number, hasta: number) {
  const q = encodeURIComponent(consulta);
  return `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&format=json&maxrecords=10&sort=datedesc&startdatetime=${fechaGDELT(desde)}&enddatetime=${fechaGDELT(hasta)}`;
}

export function parsearGDELT(texto: string): Nota[] {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new Error("GDELT no devolvió JSON (probablemente límite de frecuencia)");
  }
  const arts = z.object({ articles: z.array(z.unknown()).optional() }).parse(json).articles ?? [];
  const out: Nota[] = [];
  for (const a of arts) {
    const r = ArticuloGDELT.safeParse(a);
    if (!r.success) continue;
    const d = r.data;
    const f = d.seendate?.match(/^(\d{4})(\d{2})(\d{2})/);
    out.push({
      titulo: d.title.trim(),
      medio: d.domain ?? new URL(d.url).hostname,
      fecha: f ? `${f[1]}-${f[2]}-${f[3]}` : null,
      url: d.url,
      idioma: d.language ?? null,
      imagen: d.socialimage?.startsWith("https://") ? d.socialimage : null,
      origen: "GDELT",
    });
  }
  return out;
}

export async function notasGDELT(consulta: string, desde: number, hasta: number): Promise<Nota[]> {
  return enColaGDELT(async () => parsearGDELT(await (await pedir("GDELT", urlGDELT(consulta, desde, hasta), CACHE.gdelt)).text()));
}

// ---------- Google Noticias (RSS) ----------
export const urlGoogleNoticias = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=es-419&gl=MX&ceid=MX:es-419`;

export function parsearRSS(xml: string): Nota[] {
  const $ = cheerio.load(xml, { xml: true });
  const out: Nota[] = [];
  $("item").each((_, it) => {
    const $it = $(it);
    const medio = $it.find("source").text().trim();
    let titulo = $it.find("title").text().trim();
    if (medio && titulo.endsWith(` - ${medio}`)) titulo = titulo.slice(0, -medio.length - 3);
    const url = $it.find("link").text().trim();
    const fecha = Date.parse($it.find("pubDate").text());
    if (!titulo || !url.startsWith("https://")) return;
    out.push({
      titulo,
      medio: medio || "Google Noticias",
      fecha: Number.isFinite(fecha) ? new Date(fecha).toISOString().slice(0, 10) : null,
      url,
      idioma: "es",
      imagen: null,
      origen: "Google Noticias",
    });
  });
  return out;
}

export async function notasGoogle(q: string): Promise<Nota[]> {
  const res = await pedir("Google Noticias", urlGoogleNoticias(q), CACHE.gnews);
  return parsearRSS(await res.text());
}

// ---------- YouTube (opcional, con YOUTUBE_API_KEY) ----------
export async function videosYouTube(q: string, desde: number): Promise<{ id: string; titulo: string }[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=3&relevanceLanguage=es&q=${encodeURIComponent(q)}&publishedAfter=${new Date(desde).toISOString()}&key=${key}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000), next: { revalidate: CACHE.youtube } } as RequestInit);
  if (!res.ok) throw new Error(`YouTube HTTP ${res.status}`);
  const j = z
    .object({ items: z.array(z.object({ id: z.object({ videoId: z.string() }), snippet: z.object({ title: z.string() }) })) })
    .parse(await res.json());
  return j.items.map((i) => ({ id: i.id.videoId, titulo: i.snippet.title }));
}
