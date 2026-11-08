import { describe, expect, it } from "vitest";
import { entornoHeuristico, normalizarEntorno } from "../../lib/entorno";
import type { LimiteCercano } from "../../lib/placas";

const lim = (clase: string, distanciaKm: number): LimiteCercano => ({
  clase, categoria: "transformante", placas: ["A", "B"], distanciaKm, velocidadMmAnio: 10,
});

describe("entornoHeuristico", () => {
  it("subducción a ≤250 km gana aunque el tramo más cercano sea otra cosa", () => {
    expect(entornoHeuristico({ limite: lim("OSR", 5), subduccionA250: true, profundidadKm: 20 })).toBe("Subducción");
  });
  it("clases de PB2002", () => {
    const e = (c: string) => entornoHeuristico({ limite: lim(c, 20), subduccionA250: false, profundidadKm: 10 });
    expect(e("OTF")).toBe("Falla transformante");
    expect(e("CTF")).toBe("Falla transformante");
    expect(e("OSR")).toBe("Dorsal oceánica");
    expect(e("CRB")).toBe("Dorsal oceánica");
    expect(e("OCB")).toBe("Colisión y convergencia");
    expect(e("CCB")).toBe("Colisión y convergencia");
  });
  it("profundo y lejos del límite", () => {
    expect(entornoHeuristico({ limite: lim("SUB", 400), subduccionA250: false, profundidadKm: 600 })).toBe("Profundo (placa hundida)");
  });
  it("lejos y somero: corteza / intraplaca", () => {
    expect(entornoHeuristico({ limite: lim("CCB", 480), subduccionA250: false, profundidadKm: 10 })).toBe("Fallas en la corteza / intraplaca");
    expect(entornoHeuristico({ limite: null, subduccionA250: false, profundidadKm: 10 })).toBe("Fallas en la corteza / intraplaca");
  });
  it("normaliza los textos de la semilla", () => {
    expect(normalizarEntorno("Fallas en la corteza")).toBe("Fallas en la corteza / intraplaca");
    expect(normalizarEntorno("Colisión y convergencia")).toBe("Colisión y convergencia");
    expect(normalizarEntorno(null)).toBeNull();
  });
});
