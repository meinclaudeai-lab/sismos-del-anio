import { describe, expect, it } from "vitest";
import { calcularRitmo, fraccionAnio } from "../../lib/lineabase";
import type { LineaBase } from "../../lib/tipos";

const lb: LineaBase = { generado: "", desde: 2020, hasta: 2023, fuente: "", conteos: [
  { anio: 2020, m7: 10 }, { anio: 2021, m7: 20 }, { anio: 2022, m7: 15 }, { anio: 2023, m7: 15 },
] };

describe("línea base M7+", () => {
  it("fracción del año", () => {
    expect(fraccionAnio(2026, new Date(Date.UTC(2026, 0, 1)))).toBe(0);
    expect(fraccionAnio(2026, new Date(Date.UTC(2026, 6, 2, 12)))).toBeCloseTo(0.5, 2);
    expect(fraccionAnio(2025, new Date(Date.UTC(2026, 3, 1)))).toBe(1);
  });
  it("esperado = promedio × fracción; ritmo = conteo ÷ fracción", () => {
    const r = calcularRitmo(lb, 6, 0.5);
    expect(r.promedio).toBe(15);
    expect(r.esperadoALaFecha).toBe(7.5);
    expect(r.ritmoAnual).toBe(12);
    expect(r.minimo).toEqual({ anio: 2020, m7: 10 });
    expect(r.maximo).toEqual({ anio: 2021, m7: 20 });
    expect(r.fueraDeRango).toBeNull();
  });
  it("fuera de rango solo con ≥ 25 % del año", () => {
    expect(calcularRitmo(lb, 15, 0.5).fueraDeRango).toBe("alto");
    expect(calcularRitmo(lb, 2, 0.5).fueraDeRango).toBe("bajo");
    expect(calcularRitmo(lb, 5, 0.1).fueraDeRango).toBeNull();
  });
});
