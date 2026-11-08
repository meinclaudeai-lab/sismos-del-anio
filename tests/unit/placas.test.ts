import { describe, expect, it } from "vitest";
import { distanciaASegmentoKm, distanciaKm } from "../../lib/geo";
import { IndicePlacas, nombresPar, type Tramo } from "../../lib/placas";
import tramos from "../../data/placas-pb2002.json";

describe("distancias sobre la esfera", () => {
  it("haversine: 1° de meridiano ≈ 111.2 km", () => {
    expect(distanciaKm(0, 0, 1, 0)).toBeCloseTo(111.19, 1);
  });
  it("punto frente al tramo: distancia perpendicular", () => {
    expect(distanciaASegmentoKm(0, 0, -1, 1, 1, 1)).toBeCloseTo(111.19, 0);
  });
  it("punto más allá del extremo: distancia al extremo", () => {
    expect(distanciaASegmentoKm(3, 1, -1, 1, 1, 1)).toBeCloseTo(distanciaKm(3, 1, 1, 1), 3);
  });
  it("punto sobre el tramo: 0", () => {
    expect(distanciaASegmentoKm(0, 1, -1, 1, 1, 1)).toBeLessThan(0.01);
  });
});

describe("IndicePlacas", () => {
  const mini: Tramo[] = [
    [0, 10, 0, 11, "SUB", "NZ\\SA", 70],
    [20, 10, 20, 11, "OTF", "CA-SA", 20],
  ];
  const ip = new IndicePlacas(mini);
  it("encuentra el tramo más cercano", () => {
    const l = ip.masCercano(1, 10.5)!;
    expect(l.clase).toBe("SUB");
    expect(l.placas).toEqual(["Nazca", "Sudamericana"]);
    expect(l.distanciaKm).toBe(111);
    expect(l.velocidadMmAnio).toBe(70);
  });
  it("busca lejos si no hay nada cerca", () => {
    expect(ip.masCercano(-30, 10.5)!.distanciaKm).toBeGreaterThan(3000);
  });
  it("cercanos filtra por radio", () => {
    expect(ip.cercanos(1, 10.5, 250).map((c) => c.tramo[4])).toEqual(["SUB"]);
    expect(ip.cercanos(1, 10.5, 50)).toEqual([]);
  });
  it("cruza el antimeridiano", () => {
    const ip2 = new IndicePlacas([[0, 179.5, 0, -179.5, "OSR", "PA-AU", 50]]);
    expect(ip2.masCercano(0.5, -179.9)!.distanciaKm).toBe(56);
  });
  it("con PB2002 real: La Guaira está junto al límite transformante Caribe–Sudamérica", () => {
    const real = new IndicePlacas(tramos as Tramo[]);
    const l = real.masCercano(10.62, -67.17)!;
    expect(["CTF", "OTF"]).toContain(l.clase);
    expect(l.placas.sort()).toEqual(["Caribe", "Sudamericana"]);
    expect(l.distanciaKm).toBeLessThan(30);
  });
  it("nombres de placas en español", () => {
    expect(nombresPar("PA/NA")).toEqual(["Pacífico", "Norteamericana"]);
  });
});
