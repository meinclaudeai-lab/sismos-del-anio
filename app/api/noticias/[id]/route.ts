import { z } from "zod";
import { CACHE } from "@/lib/config";
import { busquedaAuto } from "@/lib/datos";
import { pedirJSON } from "@/lib/fetcher";
import { BASE_USGS } from "@/lib/fuentes/usgs";
import { notasGDELT, notasGoogle, videosYouTube, type Nota } from "@/lib/fuentes/noticias";
import { paisIngles, traducirLugar } from "@/lib/lugar";
import verificado from "@/data/verificado.json";

const Evento = z.object({ properties: z.object({ place: z.string().nullable(), time: z.number(), mag: z.number() }) });
const VER = verificado.sismos as Record<string, { busqueda_noticias?: string | null }>;

const CABECERAS = { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" };

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[a-z0-9]{6,24}$/i.test(id)) return Response.json({ error: "id inválido" }, { status: 400 });

  let ev: z.infer<typeof Evento>["properties"];
  try {
    ev = Evento.parse(await pedirJSON("USGS ficha", `${BASE_USGS}/query?eventid=${id}&format=geojson`, CACHE.usgsDetalle)).properties;
  } catch {
    return Response.json({ error: "sismo no encontrado en USGS" }, { status: 404 });
  }

  const { pais, lugar } = traducirLugar(ev.place);
  const busqueda = VER[id]?.busqueda_noticias ?? busquedaAuto(ev.mag, pais || lugar, ev.time);
  const ingles = paisIngles(ev.place);
  const consultaGDELT = `(earthquake OR sismo OR terremoto OR quake) "${ingles}"`;
  const hasta = Math.min(Date.now(), ev.time + 21 * 86400000);

  const [rG, rN, rY] = await Promise.allSettled([
    notasGDELT(consultaGDELT, ev.time - 3600000, hasta),
    notasGoogle(busqueda),
    videosYouTube(busqueda, ev.time - 3600000),
  ]);
  const avisos: string[] = [];
  if (rG.status === "rejected") avisos.push("GDELT no respondió; se muestran solo titulares de Google Noticias.");
  if (rN.status === "rejected") avisos.push("Google Noticias no respondió.");

  // Une y quita duplicados por título.
  const vistos = new Set<string>();
  const notas: Nota[] = [];
  for (const n of [...(rN.status === "fulfilled" ? rN.value.slice(0, 6) : []), ...(rG.status === "fulfilled" ? rG.value : [])]) {
    const k = n.titulo.toLowerCase().slice(0, 60);
    if (vistos.has(k)) continue;
    vistos.add(k);
    notas.push(n);
  }

  return Response.json(
    {
      notas,
      videos: rY.status === "fulfilled" ? rY.value : [],
      busquedaYoutube: `https://www.youtube.com/results?search_query=${encodeURIComponent(busqueda)}`,
      busquedaImagenes: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(busqueda)}`,
      avisos,
    },
    { headers: CABECERAS },
  );
}
