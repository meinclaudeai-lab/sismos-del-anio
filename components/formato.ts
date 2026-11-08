const nf0 = new Intl.NumberFormat("es", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const n0 = (n: number) => nf0.format(n);
export const n1 = (n: number) => nf1.format(n);

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function fechaUTC(t: number, conHora = true): string {
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(conHora ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : {}),
    timeZone: "UTC",
  }).format(t) + (conHora ? " UTC" : "");
}

export function fechaCorta(t: number): string {
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "UTC" }).format(t);
}

export function fechaLocal(t: number): string {
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).format(t);
}

/** "2026-10-10" → "10 oct 2026" */
export function fechaISO(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso.length <= 10 ? `${iso}T12:00:00Z` : iso);
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(t);
}

export type ClaseProfundidad = "p1" | "p2" | "p3";
export const claseProfundidad = (km: number): ClaseProfundidad => (km < 70 ? "p1" : km <= 300 ? "p2" : "p3");
export const NOMBRE_PROFUNDIDAD: Record<ClaseProfundidad, string> = {
  p1: "Superficial (< 70 km)",
  p2: "Intermedio (70–300 km)",
  p3: "Profundo (> 300 km)",
};

/** Radio en unidades del mapa (viewBox de 960 de ancho). */
export const radioMagnitud = (m: number) => Math.max(2.5, 2.5 + (m - 5) * 2.6);
