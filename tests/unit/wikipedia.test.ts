import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { numeroWiki, parsearWikipedia } from "../../lib/fuentes/wikipedia";

const html = JSON.parse(readFileSync("tests/fixtures/wikipedia-2026.json", "utf8")).parse.text as string;
const filas = parsearWikipedia(html, 2026);

describe("parser de Wikipedia (fixture real, nov 2026)", () => {
  it("lee las tablas mensuales", () => {
    expect(filas.length).toBeGreaterThan(200);
    expect(new Set(filas.map((f) => f.fecha.slice(5, 7))).size).toBe(11); // ene–nov
  });
  it("lee una fila completa", () => {
    const g = filas.find((f) => f.fecha === "2026-01-02" && f.pais === "Mexico")!;
    expect(g).toMatchObject({ mag: 6.5, profundidadKm: 18, muertos: 2, heridos: 24 });
  });
  it("celda de víctimas compartida: la cifra va solo al sismo mayor", () => {
    const ven = filas.filter((f) => f.fecha === "2026-06-24" && f.pais === "Venezuela");
    expect(ven).toHaveLength(2);
    expect(ven.every((f) => f.compartida)).toBe(true);
    expect(ven.find((f) => f.mag === 7.5)!.muertos).toBeGreaterThan(5000);
    expect(ven.find((f) => f.mag === 7.2)!.muertos).toBeNull();
  });
  it("«-» es null", () => {
    expect(filas.find((f) => f.fecha === "2026-01-01")!.muertos).toBeNull();
    expect(numeroWiki("-")).toBeNull();
    expect(numeroWiki("5,069")).toBe(5069);
    expect(numeroWiki("≥100")).toBe(100);
  });
  it("falla con gracia ante HTML inesperado", () => {
    expect(parsearWikipedia("<p>nada</p>", 2026)).toEqual([]);
    expect(parsearWikipedia('<h2 id="May">May</h2><table class="wikitable"><tr><td>x</td></tr></table>', 2026)).toEqual([]);
  });
});
