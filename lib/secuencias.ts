import { distanciaKm } from "./geo";
import type { Secuencia } from "./tipos";

export const SECUENCIA_KM = 300;
export const SECUENCIA_DIAS = 60;

type S = { id: string; tiempo: number; lat: number; lon: number; mag: number; pais: string; lugar: string };

/**
 * Agrupa sismos a ≤ 300 km y ≤ 60 días de algún otro sismo del grupo (enlace simple, union-find).
 * Solo devuelve grupos de 2 o más.
 */
export function detectarSecuencias(sismos: S[], km = SECUENCIA_KM, dias = SECUENCIA_DIAS): Secuencia[] {
  const padre = sismos.map((_, i) => i);
  const raiz = (i: number): number => (padre[i] === i ? i : (padre[i] = raiz(padre[i])));
  for (let i = 0; i < sismos.length; i++) {
    for (let j = i + 1; j < sismos.length; j++) {
      const a = sismos[i];
      const b = sismos[j];
      if (Math.abs(a.tiempo - b.tiempo) > dias * 86400000) continue;
      if (distanciaKm(a.lat, a.lon, b.lat, b.lon) > km) continue;
      padre[raiz(i)] = raiz(j);
    }
  }
  const grupos = new Map<number, S[]>();
  sismos.forEach((s, i) => grupos.set(raiz(i), [...(grupos.get(raiz(i)) ?? []), s]));
  return [...grupos.values()]
    .filter((g) => g.length >= 2)
    .map((g) => g.sort((a, b) => a.tiempo - b.tiempo))
    .sort((a, b) => a[0].tiempo - b[0].tiempo)
    .map((g, k) => {
      const mayor = g.reduce((a, b) => (b.mag > a.mag ? b : a));
      return {
        id: k + 1,
        nombre: mayor.pais ? `${mayor.pais}: ${mayor.lugar}` : mayor.lugar,
        sismos: g.map((s) => s.id),
        inicio: g[0].tiempo,
        fin: g[g.length - 1].tiempo,
        magMax: mayor.mag,
      };
    });
}
