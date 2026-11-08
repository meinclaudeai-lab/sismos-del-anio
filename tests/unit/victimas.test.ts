import { describe, expect, it } from "vitest";
import { elegirVictimas, muertesConfirmadas } from "../../lib/victimas";
import type { FilaWikipedia } from "../../lib/tipos";

const wiki: FilaWikipedia = { fecha: "2026-10-09", lugar: "Panama", pais: "Panama", mag: 7.7, profundidadKm: 12, muertos: 3, heridos: 27, compartida: false };
const fuente = { nombre: "Sinaproc", url: "https://example.org" };

describe("prioridad de cifras", () => {
  it("1. verificado gana, con su fuente y fecha", () => {
    const v = elegirVictimas({ muertos: 0, heridos: 26, fuente_cifras: fuente, fecha_cifra: "2026-10-10" }, wiki, 2026, "2026-11-07");
    expect(v).toMatchObject({ muertos: 0, heridos: 26, tipo: "verificado", fecha: "2026-10-10", fuente });
  });
  it("2. sin cifra verificada, Wikipedia con fecha de consulta", () => {
    const v = elegirVictimas({ muertos: null, heridos: null }, wiki, 2026, "2026-11-07");
    expect(v).toMatchObject({ muertos: 3, heridos: 27, tipo: "wikipedia", fecha: "2026-11-07" });
    expect(v.fuente?.url).toContain("List_of_earthquakes_in_2026");
  });
  it("una nota verificada bloquea a Wikipedia (evita contar dos veces)", () => {
    const v = elegirVictimas({ muertos: null, nota_victimas: "Contados con el M7.5" }, wiki, 2026, "2026-11-07");
    expect(v).toMatchObject({ muertos: null, tipo: "verificado", nota: "Contados con el M7.5" });
  });
  it("3. sin nada: Sin reportes", () => {
    expect(elegirVictimas(undefined, undefined, 2026, null).tipo).toBe("ninguna");
    expect(elegirVictimas(undefined, { ...wiki, muertos: null, heridos: null }, 2026, null).tipo).toBe("ninguna");
  });
  it("las muertes confirmadas no suman estimaciones ni nulos", () => {
    const l = [
      { victimas: elegirVictimas({ muertos: 10 }, undefined, 2026, null) },
      { victimas: elegirVictimas(undefined, wiki, 2026, "x") },
      { victimas: elegirVictimas(undefined, undefined, 2026, null) },
    ];
    expect(muertesConfirmadas(l)).toBe(13);
  });
});
