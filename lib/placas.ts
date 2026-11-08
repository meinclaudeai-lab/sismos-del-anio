import { distanciaASegmentoKm } from "./geo";
import nombresPlacas from "../data/nombres-placas.json";

/** Tramo de PB2002: [latA, lonA, latB, lonB, STEPCLASS, PLATEBOUND, VELOCITYLE mm/año] */
export type Tramo = [number, number, number, number, string, string, number];

export type CategoriaLimite = "subduccion" | "colision" | "dorsal" | "transformante";

export function categoriaLimite(stepclass: string): CategoriaLimite {
  switch (stepclass) {
    case "SUB":
      return "subduccion";
    case "OCB":
    case "CCB":
      return "colision";
    case "OSR":
    case "CRB":
      return "dorsal";
    default:
      return "transformante"; // OTF, CTF
  }
}

export const NOMBRE_CATEGORIA: Record<CategoriaLimite, string> = {
  subduccion: "de subducción",
  colision: "de colisión",
  dorsal: "de dorsal (divergente)",
  transformante: "transformante",
};

const NOMBRES = nombresPlacas as Record<string, string>;

/** "CA-SA", "NZ\\SA" o "PA/NA" → ["Caribe", "Sudamericana"] */
export function nombresPar(platebound: string): [string, string] {
  const [a, b] = platebound.split(/[-\\/]/);
  return [NOMBRES[a] ?? a, NOMBRES[b] ?? b];
}

export type LimiteCercano = {
  clase: string;
  categoria: CategoriaLimite;
  placas: [string, string];
  distanciaKm: number;
  velocidadMmAnio: number;
};

const CELDA = 2; // grados

export class IndicePlacas {
  private celdas = new Map<string, number[]>();

  constructor(private tramos: Tramo[]) {
    tramos.forEach((t, i) => {
      const [la, lo, lb, lob] = t;
      // Tramos que cruzan el antimeridiano: se indexan en ambos extremos.
      const cruza = Math.abs(lo - lob) > 180;
      const rangos: [number, number][] = cruza
        ? [[Math.max(lo, lob), 180], [-180, Math.min(lo, lob)]]
        : [[Math.min(lo, lob), Math.max(lo, lob)]];
      for (const [l0, l1] of rangos) {
        for (let y = Math.floor(Math.min(la, lb) / CELDA); y <= Math.floor(Math.max(la, lb) / CELDA); y++) {
          for (let x = Math.floor(l0 / CELDA); x <= Math.floor(l1 / CELDA); x++) {
            const k = `${y},${x}`;
            const lista = this.celdas.get(k);
            if (lista) lista.push(i);
            else this.celdas.set(k, [i]);
          }
        }
      }
    });
  }

  private candidatos(lat: number, lon: number, radioGrados: number): Set<number> {
    const out = new Set<number>();
    const dLon = Math.min(180, radioGrados / Math.max(0.05, Math.cos((lat * Math.PI) / 180)));
    const y0 = Math.floor((lat - radioGrados) / CELDA);
    const y1 = Math.floor((lat + radioGrados) / CELDA);
    const x0 = Math.floor((lon - dLon) / CELDA);
    const x1 = Math.floor((lon + dLon) / CELDA);
    const nx = 360 / CELDA;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const xn = ((((x + nx / 2) % nx) + nx) % nx) - nx / 2; // envuelve longitudes
        this.celdas.get(`${y},${xn}`)?.forEach((i) => out.add(i));
      }
    }
    return out;
  }

  private dist(i: number, lat: number, lon: number): number {
    const [la, lo, lb, lob] = this.tramos[i];
    return distanciaASegmentoKm(lat, lon, la, lo, lb, lob);
  }

  /** Tramos a ≤ km del punto. */
  cercanos(lat: number, lon: number, km: number): { tramo: Tramo; km: number }[] {
    const out: { tramo: Tramo; km: number }[] = [];
    for (const i of this.candidatos(lat, lon, km / 111 + CELDA)) {
      const d = this.dist(i, lat, lon);
      if (d <= km) out.push({ tramo: this.tramos[i], km: d });
    }
    return out.sort((a, b) => a.km - b.km);
  }

  masCercano(lat: number, lon: number): LimiteCercano | null {
    for (const radio of [3, 6, 12, 24, 48, 90, 180]) {
      let mejor = -1;
      let mejorKm = Infinity;
      for (const i of this.candidatos(lat, lon, radio)) {
        const d = this.dist(i, lat, lon);
        if (d < mejorKm) {
          mejorKm = d;
          mejor = i;
        }
      }
      // Solo es seguro si la distancia encontrada cabe en el radio buscado.
      if (mejor >= 0 && (mejorKm <= (radio - CELDA) * 111 || radio === 180)) {
        const t = this.tramos[mejor];
        return {
          clase: t[4],
          categoria: categoriaLimite(t[4]),
          placas: nombresPar(t[5]),
          distanciaKm: Math.round(mejorKm),
          velocidadMmAnio: Math.round(t[6]),
        };
      }
    }
    return null;
  }
}
