import type { Entorno } from "./entorno";
import { NOMBRE_CATEGORIA, type LimiteCercano } from "./placas";

const fmt = (n: number) => new Intl.NumberFormat("es", { maximumFractionDigits: 0 }).format(n);

const ADJETIVOS = /(ana|ica|iga|ática|alí)$/; // Sudamericana, Antártica, Arábiga, Somalí...
const MASCULINOS = /^(Caribe|Pacífico|Egeo|Altiplano|Yangtsé|Amur|Mar )/;

/** Nombre de placa con su preposición: «Sudamericana», «de Nazca», «del Caribe». */
export function conPreposicion(n: string): string {
  if (ADJETIVOS.test(n)) return n;
  return MASCULINOS.test(n) ? `del ${n}` : `de ${n}`;
}

/** «las placas del Caribe y Sudamericana» */
export function par([a, b]: [string, string]): string {
  return `las placas ${conPreposicion(a)} y ${conPreposicion(b)}`;
}

/**
 * Texto automático de «Por qué aquí» para sismos sin texto verificado. Ej.:
 * «Ocurrió a 12 km de profundidad, a 3 km del límite transformante entre las placas del Caribe y Sudamericana,
 *  que se desplazan unos 20 mm al año».
 */
export function porQueAquiAuto(profundidadKm: number, limite: LimiteCercano | null, entorno: Entorno): string {
  const prof = `Ocurrió a ${fmt(profundidadKm)} km de profundidad`;
  if (!limite) return `${prof}.`;
  const tramo = `${limite.distanciaKm <= 5 ? "junto al" : `a ${fmt(limite.distanciaKm)} km del`} límite ${NOMBRE_CATEGORIA[limite.categoria]} entre ${par(limite.placas)}`;
  const vel = limite.velocidadMmAnio > 0 ? `, que se desplazan unos ${fmt(limite.velocidadMmAnio)} mm al año` : "";
  let extra = "";
  if (entorno === "Profundo (placa hundida)") extra = " Por su profundidad, probablemente se originó dentro de una placa hundida en el manto.";
  else if (entorno === "Fallas en la corteza / intraplaca")
    extra = " Está lejos de ese límite, así que se atribuye a fallas dentro de la corteza.";
  else if (entorno === "Subducción" && limite.categoria !== "subduccion")
    extra = " Hay una zona de subducción a menos de 250 km, que es la explicación más probable.";
  return `${prof}, ${tramo}${vel}.${extra}`;
}
