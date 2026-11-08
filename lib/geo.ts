const R = 6371; // radio medio de la Tierra, km
const rad = (d: number) => (d * Math.PI) / 180;

/** Distancia de gran círculo (haversine) en km. */
export function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

type V3 = [number, number, number];
const aVec = (lat: number, lon: number): V3 => [
  Math.cos(rad(lat)) * Math.cos(rad(lon)),
  Math.cos(rad(lat)) * Math.sin(rad(lon)),
  Math.sin(rad(lat)),
];
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const punto = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norma = (a: V3) => Math.sqrt(punto(a, a));

/** Distancia mínima en km de un punto a un arco de gran círculo A–B, sobre la esfera. */
export function distanciaASegmentoKm(
  lat: number,
  lon: number,
  latA: number,
  lonA: number,
  latB: number,
  lonB: number,
): number {
  const p = aVec(lat, lon);
  const a = aVec(latA, lonA);
  const b = aVec(latB, lonB);
  const n = cruz(a, b);
  const nn = norma(n);
  const extremos = Math.min(distanciaKm(lat, lon, latA, lonA), distanciaKm(lat, lon, latB, lonB));
  if (nn < 1e-12) return extremos;
  // Proyección de p sobre el plano del gran círculo y prueba de si cae dentro del arco.
  const sinCross = punto(p, n) / nn;
  const proj: V3 = [p[0] - (sinCross * n[0]) / nn, p[1] - (sinCross * n[1]) / nn, p[2] - (sinCross * n[2]) / nn];
  const dentro = punto(cruz(a, proj), n) >= 0 && punto(cruz(proj, b), n) >= 0;
  if (!dentro) return extremos;
  return Math.abs(Math.asin(Math.max(-1, Math.min(1, sinCross)))) * R;
}
