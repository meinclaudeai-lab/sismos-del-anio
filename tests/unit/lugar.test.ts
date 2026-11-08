import { describe, expect, it } from "vitest";
import { traducirLugar } from "../../lib/lugar";

describe("traducirLugar", () => {
  it("ejemplo del PROMPT", () => {
    expect(traducirLugar("20 km W of Catia La Mar, Venezuela")).toEqual({
      lugar: "A 20 km al O de Catia La Mar, Venezuela", pais: "Venezuela", iso: "VE",
    });
  });
  it("rumbos compuestos", () => {
    expect(traducirLugar("203 km NW of Port-Olry, Vanuatu").lugar).toBe("A 203 km al NO de Port-Olry, Vanuatu");
    expect(traducirLugar("5 km SSW of Uki, Japan").lugar).toBe("A 5 km al SSO de Uki, Japón");
  });
  it("regiones y estados de EE. UU.", () => {
    expect(traducirLugar("Bonin Islands, Japan region")).toMatchObject({ lugar: "Islas Bonin, región de Japón", pais: "Japón" });
    expect(traducirLugar("100 km S of Adak, Alaska")).toMatchObject({ lugar: "A 100 km al S de Adak, Alaska", pais: "Estados Unidos" });
  });
  it("frases sin país", () => {
    expect(traducirLugar("central Mid-Atlantic Ridge")).toMatchObject({ lugar: "Dorsal Mesoatlántica central", pais: "Océano Atlántico" });
  });
  it("desconocido: conserva el texto", () => {
    expect(traducirLugar("Somewhere odd")).toMatchObject({ lugar: "Somewhere odd" });
    expect(traducirLugar(null).lugar).toBe("Lugar sin especificar");
  });
});
