export const MIN_MAG = Number(process.env.MIN_MAG ?? 6.5);
export const SITE_URL = process.env.SITE_URL ?? "https://sismos-del-anio.vercel.app";
export const USER_AGENT = `SismosDelAnio/1.0 (${SITE_URL}; proyecto informativo sin fines de lucro)`;
export const TIMEOUT_MS = 8000;

/** Tiempos de caché por fuente, en segundos (tabla de fuentes del PROMPT). */
export const CACHE = {
  usgs: 600,
  usgsDetalle: 3600,
  usgsConteo: 30 * 24 * 3600,
  geofon: 3600,
  emsc: 3600,
  gdacs: 3600,
  wikipedia: 6 * 3600,
  reliefweb: 6 * 3600,
  gdelt: 3600,
  gnews: 3600,
  youtube: 6 * 3600,
} as const;

export function anioActual(now = new Date()): number {
  return now.getUTCFullYear();
}
