import "server-only";
import { obtenerDatos } from "./datos";
import type { Datos } from "./tipos";
import respaldo from "../data/respaldo.json";

/**
 * Durante una regeneración ISR, si USGS falla se lanza el error para que Vercel siga sirviendo
 * la última versión buena. Si todavía no existe ninguna (el primer build), se usa data/respaldo.json.
 */
export async function datosPagina(anio: number): Promise<Datos> {
  try {
    return await obtenerDatos(anio);
  } catch (e) {
    const r = respaldo as unknown as Datos;
    if (process.env.NEXT_PHASE === "phase-production-build" && r.anio === anio) {
      console.warn("USGS falló durante el build; se usa data/respaldo.json", e);
      return { ...r, esRespaldo: true };
    }
    throw e;
  }
}
