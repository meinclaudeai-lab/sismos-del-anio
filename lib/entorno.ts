import type { IndicePlacas, LimiteCercano } from "./placas";

export const ENTORNOS = [
  "Subducción",
  "Falla transformante",
  "Dorsal oceánica",
  "Colisión y convergencia",
  "Profundo (placa hundida)",
  "Fallas en la corteza / intraplaca",
] as const;
export type Entorno = (typeof ENTORNOS)[number];

/** Distancia máxima al límite para usar su clase (km). */
export const UMBRAL_CLASE_KM = 150;

export type EntradaEntorno = {
  limite: LimiteCercano | null;
  /** ¿Hay algún tramo SUB a ≤ 250 km? */
  subduccionA250: boolean;
  profundidadKm: number;
};

/** Heurística de entorno tectónico (ver PROMPT y CLAUDE.md). El orden de las reglas importa. */
export function entornoHeuristico({ limite, subduccionA250, profundidadKm }: EntradaEntorno): Entorno {
  if (subduccionA250) return "Subducción";
  const dist = limite?.distanciaKm ?? Infinity;
  if (limite && dist <= UMBRAL_CLASE_KM) {
    if (limite.clase === "OTF" || limite.clase === "CTF") return "Falla transformante";
    if (limite.clase === "OSR" || limite.clase === "CRB") return "Dorsal oceánica";
    if (limite.clase === "OCB" || limite.clase === "CCB") return "Colisión y convergencia";
  }
  if (dist > 300 && profundidadKm > 300) return "Profundo (placa hundida)";
  return "Fallas en la corteza / intraplaca";
}

export function calcularEntorno(indice: IndicePlacas, lat: number, lon: number, profundidadKm: number) {
  const limite = indice.masCercano(lat, lon);
  const subduccionA250 = indice.cercanos(lat, lon, 250).some((c) => c.tramo[4] === "SUB");
  return { limite, entorno: entornoHeuristico({ limite, subduccionA250, profundidadKm }) };
}

/** Normaliza los textos de entorno de la semilla ("Fallas en la corteza") a las categorías fijas. */
export function normalizarEntorno(texto: string | null | undefined): Entorno | null {
  if (!texto) return null;
  const t = texto.toLowerCase();
  if (t.startsWith("subducc")) return "Subducción";
  if (t.includes("transformante")) return "Falla transformante";
  if (t.includes("dorsal")) return "Dorsal oceánica";
  if (t.includes("colisi") || t.includes("convergencia")) return "Colisión y convergencia";
  if (t.includes("profundo")) return "Profundo (placa hundida)";
  if (t.includes("corteza") || t.includes("intraplaca")) return "Fallas en la corteza / intraplaca";
  return null;
}
