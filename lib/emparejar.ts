import { distanciaKm } from "./geo";
import { paisIngles } from "./lugar";
import type { EventoCatalogo, FilaWikipedia } from "./tipos";

export const MAX_DT_CATALOGO_S = 90;
export const MAX_DT_WIKI_S = 120;
export const MAX_DIST_KM = 150;

type Punto = { tiempo: number; lat: number; lon: number };

/** ¿Es el mismo sismo? |Δt| ≤ maxDt segundos y distancia ≤ maxKm. */
export function mismoSismo(a: Punto, b: Punto, maxDtS = MAX_DT_CATALOGO_S, maxKm = MAX_DIST_KM): boolean {
  return Math.abs(a.tiempo - b.tiempo) <= maxDtS * 1000 && distanciaKm(a.lat, a.lon, b.lat, b.lon) <= maxKm;
}

/**
 * Empareja cada evento base con el candidato más cercano en tiempo que cumpla los umbrales.
 * Cada candidato se usa una sola vez.
 */
export function emparejar<B extends Punto, C extends Punto>(
  base: B[],
  candidatos: C[],
  maxDtS = MAX_DT_CATALOGO_S,
  maxKm = MAX_DIST_KM,
): Map<B, C> {
  const pares: { b: B; c: C; dt: number }[] = [];
  for (const b of base)
    for (const c of candidatos)
      if (mismoSismo(b, c, maxDtS, maxKm)) pares.push({ b, c, dt: Math.abs(b.tiempo - c.tiempo) });
  pares.sort((x, y) => x.dt - y.dt);
  const out = new Map<B, C>();
  const usados = new Set<C>();
  for (const { b, c } of pares) {
    if (out.has(b) || usados.has(c)) continue;
    out.set(b, c);
    usados.add(c);
  }
  return out;
}

const ALIAS_PAIS: Record<string, string[]> = {
  "United States": ["Alaska", "California", "Hawaii", "Nevada", "Oregon", "Washington", "Aleutian Islands"],
  Russia: ["Kamchatka", "Kuril Islands"],
  Japan: ["Bonin Islands", "Izu Islands", "Ryukyu Islands"],
  "New Caledonia": ["Loyalty Islands"],
  Indonesia: ["Molucca Sea", "Banda Sea", "Flores Sea", "Java Sea"],
  "New Zealand": ["Kermadec Islands"],
  Malaysia: ["Sabah"],
};

function mismoPais(placeUSGS: string, paisWiki: string): boolean {
  const pu = paisIngles(placeUSGS).toLowerCase();
  const pw = paisWiki.toLowerCase();
  if (!pw) return false;
  if (pu.includes(pw) || pw.includes(pu) || placeUSGS.toLowerCase().includes(pw)) return true;
  return (ALIAS_PAIS[paisWiki] ?? []).some((a) => placeUSGS.toLowerCase().includes(a.toLowerCase()));
}

/**
 * Wikipedia solo publica el día (UTC) y el lugar, sin hora ni coordenadas, así que el criterio
 * de Δt ≤ 2 min y ≤ 150 km no se puede aplicar tal cual. Se usa: mismo día UTC (±1 por zonas
 * horarias mal anotadas), |ΔM| ≤ 0.3 y el mismo país en el texto del lugar. Gana la menor |ΔM|.
 */
export function emparejarWikipedia<E extends EventoCatalogo>(
  eventos: E[],
  filas: FilaWikipedia[],
): Map<E, FilaWikipedia> {
  const pares: { e: E; f: FilaWikipedia; costo: number }[] = [];
  for (const e of eventos) {
    const dia = new Date(e.tiempo).toISOString().slice(0, 10);
    for (const f of filas) {
      const dDias = Math.abs(Date.parse(`${f.fecha}T00:00:00Z`) - Date.parse(`${dia}T00:00:00Z`)) / 86400000;
      const dMag = Math.abs(f.mag - e.mag);
      if (dDias > 1 || dMag > 0.3 || !mismoPais(e.lugar, f.pais)) continue;
      const dProf = f.profundidadKm == null ? 0 : Math.abs(f.profundidadKm - e.profundidadKm) / 100;
      pares.push({ e, f, costo: dMag + dDias + dProf });
    }
  }
  pares.sort((a, b) => a.costo - b.costo);
  const out = new Map<E, FilaWikipedia>();
  const usadas = new Set<FilaWikipedia>();
  for (const { e, f } of pares) {
    if (out.has(e) || usadas.has(f)) continue;
    out.set(e, f);
    usadas.add(f);
  }
  return out;
}
