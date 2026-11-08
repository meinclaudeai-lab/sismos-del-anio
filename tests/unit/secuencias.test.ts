import { describe, expect, it } from "vitest";
import { detectarSecuencias } from "../../lib/secuencias";
import verificado from "../../data/verificado.json";

const dia = 86400000;
const s = (id: string, d: number, lat: number, lon: number, mag = 6.5) => ({ id, tiempo: d * dia, lat, lon, mag, pais: "X", lugar: id });

describe("detectarSecuencias", () => {
  it("agrupa por cadena ≤300 km y ≤60 días", () => {
    const r = detectarSecuencias([s("a", 0, 0, 0), s("b", 50, 0, 2), s("c", 100, 0, 4), s("d", 0, 30, 30)]);
    expect(r).toHaveLength(1);
    expect(r[0].sismos).toEqual(["a", "b", "c"]);
  });
  it("no agrupa si pasa de 60 días o 300 km", () => {
    expect(detectarSecuencias([s("a", 0, 0, 0), s("b", 61, 0, 0)])).toEqual([]);
    expect(detectarSecuencias([s("a", 0, 0, 0), s("b", 1, 0, 2.8)])).toEqual([]);
  });
  it("con la semilla 2026 salen Sanriku, Mindanao, Venezuela y Panamá", () => {
    const ev = Object.entries(verificado.sismos)
      .filter(([, v]) => v.magnitud_usgs >= 6.5)
      .map(([id, v]) => ({ id, tiempo: Date.parse(v.fecha_utc.length > 10 ? v.fecha_utc : `${v.fecha_utc}T00:00Z`), lat: v.lat, lon: v.lon, mag: v.magnitud_usgs, pais: v.pais ?? "", lugar: v.lugar ?? "" }));
    const nombres = detectarSecuencias(ev).map((q) => q.nombre);
    for (const n of ["Sanriku", "Mindanao", "Venezuela", "Panamá"]) expect(nombres.some((x) => x.includes(n))).toBe(true);
  });
});
