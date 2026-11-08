import { describe, expect, it } from "vitest";
import { emparejar, emparejarWikipedia, mismoSismo } from "../../lib/emparejar";
import type { EventoCatalogo, FilaWikipedia } from "../../lib/tipos";

const t0 = Date.UTC(2026, 5, 24, 22, 5, 0);
const ev = (id: string, dt: number, lat: number, lon: number, mag = 7, lugar = "17 km W of La Guaira, Venezuela"): EventoCatalogo => ({
  id, tiempo: t0 + dt * 1000, lat, lon, profundidadKm: 10, mag, magTipo: "mww", lugar,
});

describe("mismoSismo", () => {
  it("acepta |Δt| ≤ 90 s y ≤ 150 km", () => {
    expect(mismoSismo(ev("a", 0, 10.6, -67), ev("b", 90, 10.6, -67))).toBe(true);
    expect(mismoSismo(ev("a", 0, 10.6, -67), ev("b", 0, 11.9, -67))).toBe(true); // ~145 km
  });
  it("rechaza fuera de umbral", () => {
    expect(mismoSismo(ev("a", 0, 10.6, -67), ev("b", 91, 10.6, -67))).toBe(false);
    expect(mismoSismo(ev("a", 0, 10.6, -67), ev("b", 0, 12.0, -67))).toBe(false); // ~156 km
  });
  it("Wikipedia usa 2 min", () => {
    expect(mismoSismo(ev("a", 0, 0, 0), ev("b", 119, 0, 0), 120)).toBe(true);
    expect(mismoSismo(ev("a", 0, 0, 0), ev("b", 121, 0, 0), 120)).toBe(false);
  });
});

describe("emparejar", () => {
  it("usa cada candidato una sola vez y prefiere el más cercano en tiempo", () => {
    const base = [ev("u1", 0, 10.6, -67), ev("u2", 60, 10.6, -67.1)];
    const cands = [ev("g1", 55, 10.6, -67.1), ev("g2", 5, 10.6, -67)];
    const m = emparejar(base, cands);
    expect(m.get(base[0])?.id).toBe("g2");
    expect(m.get(base[1])?.id).toBe("g1");
  });
  it("deja sin pareja lo que no cumple", () => {
    expect(emparejar([ev("u", 0, 0, 0)], [ev("g", 600, 0, 0)]).size).toBe(0);
  });
});

describe("emparejarWikipedia", () => {
  const fila = (fecha: string, mag: number, pais: string, muertos: number | null = null): FilaWikipedia => ({
    fecha, lugar: `${pais}, algo`, pais, mag, profundidadKm: 10, muertos, heridos: null, compartida: false,
  });
  it("empareja por día, magnitud y país", () => {
    const e = ev("u", 0, 10.6, -67, 7.5);
    const m = emparejarWikipedia([e], [fila("2026-06-24", 7.2, "Venezuela"), fila("2026-06-24", 7.5, "Venezuela", 10)]);
    expect(m.get(e)?.mag).toBe(7.5);
  });
  it("no empareja otro país ni otra magnitud", () => {
    const e = ev("u", 0, 10.6, -67, 7.5);
    expect(emparejarWikipedia([e], [fila("2026-06-24", 7.5, "Colombia")]).size).toBe(0);
    expect(emparejarWikipedia([e], [fila("2026-06-24", 6.9, "Venezuela")]).size).toBe(0);
    expect(emparejarWikipedia([e], [fila("2026-06-27", 7.5, "Venezuela")]).size).toBe(0);
  });
  it("reconoce alias de región (Alaska → United States)", () => {
    const e = ev("u", 0, 52, -175, 6.5, "Andreanof Islands, Aleutian Islands, Alaska");
    expect(emparejarWikipedia([e], [fila("2026-06-24", 6.5, "United States")]).size).toBe(1);
  });
});
