import type { LineaBase } from "./tipos";

/** Fracción del año transcurrida (0–1) en UTC. Para años pasados devuelve 1. */
export function fraccionAnio(anio: number, ahora = new Date()): number {
  const ini = Date.UTC(anio, 0, 1);
  const fin = Date.UTC(anio + 1, 0, 1);
  const t = ahora.getTime();
  if (t >= fin) return 1;
  if (t <= ini) return 0;
  return (t - ini) / (fin - ini);
}

export type Ritmo = {
  promedio: number;
  minimo: { anio: number; m7: number };
  maximo: { anio: number; m7: number };
  esperadoALaFecha: number;
  ritmoAnual: number | null;
  fraccion: number;
  /** ¿El ritmo anual proyectado cae fuera del rango histórico? */
  fueraDeRango: "alto" | "bajo" | null;
};

export function calcularRitmo(lineaBase: LineaBase, conteoActual: number, fraccion: number): Ritmo {
  const conteos = lineaBase.conteos;
  const promedio = conteos.reduce((s, c) => s + c.m7, 0) / conteos.length;
  const minimo = conteos.reduce((a, b) => (b.m7 < a.m7 ? b : a));
  const maximo = conteos.reduce((a, b) => (b.m7 > a.m7 ? b : a));
  const ritmoAnual = fraccion > 0 ? conteoActual / fraccion : null;
  // Con menos de un cuarto del año, la proyección es demasiado ruidosa para declarar nada.
  let fueraDeRango: Ritmo["fueraDeRango"] = null;
  if (ritmoAnual != null && fraccion >= 0.25) {
    if (ritmoAnual > maximo.m7) fueraDeRango = "alto";
    else if (ritmoAnual < minimo.m7) fueraDeRango = "bajo";
  }
  return { promedio, minimo, maximo, esperadoALaFecha: promedio * fraccion, ritmoAnual, fraccion, fueraDeRango };
}
