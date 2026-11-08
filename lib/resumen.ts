import { ENTORNOS, type Entorno } from "./entorno";
import { calcularRitmo, fraccionAnio, type Ritmo } from "./lineabase";
import type { Datos, Sismo } from "./tipos";
import { muertesConfirmadas } from "./victimas";

const n0 = (n: number) => new Intl.NumberFormat("es", { maximumFractionDigits: 0 }).format(n);
const n1 = (n: number) => new Intl.NumberFormat("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

export type Cifras = {
  totalPrincipales: number;
  m7: number;
  ritmo: Ritmo;
  muertes: number;
  conMuertes: number;
  maxima: Sismo | null;
  masMortifero: Sismo | null;
  cercaDeLimite: number; // % de sismos principales a ≤ 250 km de un límite de placas
  porEntorno: { entorno: Entorno; n: number }[];
  porMes: number[];
};

export function calcularCifras(d: Datos): Cifras {
  const principales = d.sismos.filter((s) => !s.menor);
  const m7 = principales.filter((s) => s.mag >= 7).length;
  const fin = d.anio < new Date(d.generado).getUTCFullYear() ? new Date(Date.UTC(d.anio + 1, 0, 1)) : new Date(d.generado);
  const ritmo = calcularRitmo(d.lineaBase, m7, fraccionAnio(d.anio, fin));
  const maxima = principales.reduce<Sismo | null>((a, b) => (!a || b.mag > a.mag ? b : a), null);
  const masMortifero = d.sismos.reduce<Sismo | null>(
    (a, b) => ((b.victimas.muertos ?? 0) > (a?.victimas.muertos ?? 0) ? b : a),
    null,
  );
  const cerca = principales.filter((s) => s.limite && s.limite.distanciaKm <= 250).length;
  const porMes = Array.from({ length: 12 }, (_, m) => principales.filter((s) => new Date(s.tiempo).getUTCMonth() === m).length);
  return {
    totalPrincipales: principales.length,
    m7,
    ritmo,
    muertes: muertesConfirmadas(d.sismos),
    conMuertes: d.sismos.filter((s) => (s.victimas.muertos ?? 0) > 0).length,
    maxima,
    masMortifero: masMortifero && (masMortifero.victimas.muertos ?? 0) > 0 ? masMortifero : null,
    cercaDeLimite: principales.length ? Math.round((cerca / principales.length) * 100) : 0,
    porEntorno: ENTORNOS.map((entorno) => ({ entorno, n: principales.filter((s) => s.entorno === entorno).length })),
    porMes,
  };
}

/** Compara el conteo M7+ con lo esperado a la fecha. */
export function comparacionM7(c: Cifras): "por encima" | "por debajo" | "en línea" {
  const { ritmo, m7 } = c;
  if (ritmo.fueraDeRango === "alto") return "por encima";
  if (ritmo.fueraDeRango === "bajo") return "por debajo";
  const margen = Math.max(2, ritmo.esperadoALaFecha * 0.3);
  if (m7 > ritmo.esperadoALaFecha + margen) return "por encima";
  if (m7 < ritmo.esperadoALaFecha - margen) return "por debajo";
  return "en línea";
}

/** Frase de conclusión del encabezado, armada con los datos. */
export function fraseConclusion(d: Datos, c: Cifras): string {
  const partes: string[] = [];
  const cuando = c.ritmo.fraccion >= 1 ? `En ${d.anio} hubo` : `En lo que va de ${d.anio} van`;
  partes.push(
    `${cuando} ${n0(c.totalPrincipales)} sismos de magnitud ${n1(d.minMag)} o más; ${n0(c.m7)} llegaron a 7 o más, ${
      comparacionM7(c) === "en línea"
        ? `en línea con lo esperado a esta altura del año (unos ${n0(c.ritmo.esperadoALaFecha)})`
        : `${comparacionM7(c)} de lo esperado a esta altura del año (unos ${n0(c.ritmo.esperadoALaFecha)})`
    }.`,
  );
  if (c.masMortifero) {
    const m = c.masMortifero;
    partes.push(
      `El más mortífero fue el de ${m.pais || m.lugar} (M${n1(m.mag)}), con ${n0(m.victimas.muertos ?? 0)} muertes confirmadas.`,
    );
  }
  return partes.join(" ");
}

/** Texto central de «¿Hay un patrón o una tendencia?». Cambia solo si el año sale del rango histórico. */
export function textoPatron(d: Datos, c: Cifras): { patron: string; tendencia: string } {
  const { ritmo } = c;
  const lb = d.lineaBase;
  const sub = c.porEntorno.find((e) => e.entorno === "Subducción")?.n ?? 0;
  const pctSub = c.totalPrincipales ? Math.round((sub / c.totalPrincipales) * 100) : 0;
  const patron = `Sí hay un patrón, y es el de siempre: ${n0(c.cercaDeLimite)} % de los sismos de magnitud ${n1(
    d.minMag,
  )} o más de ${d.anio} ocurrieron a menos de 250 km de un límite de placas, y ${pctSub} % en zonas de subducción, como las del Cinturón de Fuego del Pacífico.`;
  const rango = `Entre ${lb.desde} y ${lb.hasta}, USGS registró entre ${ritmo.minimo.m7} (${ritmo.minimo.anio}) y ${ritmo.maximo.m7} (${ritmo.maximo.anio}) sismos M7+ por año, con un promedio de ${n1(ritmo.promedio)}.`;
  const proy = ritmo.ritmoAnual != null && ritmo.fraccion < 1 ? ` Al ritmo actual, ${d.anio} cerraría con unos ${n0(ritmo.ritmoAnual)}.` : "";
  let tendencia: string;
  if (ritmo.fueraDeRango === "alto")
    tendencia = `${rango}${proy} Eso supera el máximo del registro: el año está fuera del rango histórico, aunque un solo año no basta para hablar de una tendencia global.`;
  else if (ritmo.fueraDeRango === "bajo")
    tendencia = `${rango}${proy} Eso queda por debajo del mínimo del registro: el año está fuera del rango histórico, aunque un solo año no basta para hablar de una tendencia global.`;
  else
    tendencia = `Lo que no hay es una tendencia global nueva. ${rango} ${d.anio} lleva ${n0(c.m7)}.${proy} Está dentro de la variación normal de un año a otro.`;
  return { patron, tendencia };
}
