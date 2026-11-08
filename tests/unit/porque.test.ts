import { describe, expect, it } from "vitest";
import { par, porQueAquiAuto } from "../../lib/porque";

describe("«Por qué aquí» automático", () => {
  it("ejemplo del PROMPT", () => {
    expect(porQueAquiAuto(12, { clase: "CTF", categoria: "transformante", placas: ["Caribe", "Sudamericana"], distanciaKm: 3, velocidadMmAnio: 20 }, "Falla transformante"))
      .toBe("Ocurrió a 12 km de profundidad, junto al límite transformante entre las placas del Caribe y Sudamericana, que se desplazan unos 20 mm al año.");
  });
  it("preposiciones", () => {
    expect(par(["Nazca", "Sudamericana"])).toBe("las placas de Nazca y Sudamericana");
    expect(par(["Pacífico", "Norteamericana"])).toBe("las placas del Pacífico y Norteamericana");
  });
});
