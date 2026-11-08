import { anioActual, MIN_MAG } from "@/lib/config";
import { obtenerDatos } from "@/lib/datos";

/** Datos ya combinados, en JSON. Acepta ?año=AAAA (desde 1976). */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const actual = anioActual();
  const anio = Number(p.get("año") ?? p.get("anio") ?? actual);
  if (!Number.isInteger(anio) || anio < 1976 || anio > actual) {
    return Response.json({ error: `año fuera de rango (1976–${actual})` }, { status: 400 });
  }
  try {
    const datos = await obtenerDatos(anio, MIN_MAG);
    return Response.json(datos, {
      headers: { "Cache-Control": `public, s-maxage=${anio === actual ? 900 : 86400}, stale-while-revalidate=86400` },
    });
  } catch (e) {
    return Response.json({ error: String((e as Error).message) }, { status: 502 });
  }
}
