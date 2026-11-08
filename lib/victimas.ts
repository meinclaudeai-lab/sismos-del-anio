import type { Enlace, FilaWikipedia, Victimas } from "./tipos";
import { urlPaginaWikipedia } from "./fuentes/wikipedia";

export type RegistroVerificado = {
  muertos?: number | null;
  heridos?: number | null;
  nota_victimas?: string | null;
  fuente_cifras?: Enlace | null;
  fecha_cifra?: string | null;
};

const SIN_REPORTES: Victimas = { muertos: null, heridos: null, tipo: "ninguna", fuente: null, fecha: null, nota: null };

/**
 * Prioridad de cifras de víctimas:
 *  1. data/verificado.json (si trae muertos o heridos, o una nota que explique por qué no hay cifra).
 *  2. Wikipedia, rotulada «recopilación de Wikipedia, consultada el {fecha}».
 *  3. «Sin reportes».
 * Las estimaciones (PAGER, GDACS) nunca entran aquí.
 */
export function elegirVictimas(
  verificado: RegistroVerificado | undefined,
  wiki: FilaWikipedia | undefined,
  anio: number,
  consultaWiki: string | null,
): Victimas {
  if (verificado) {
    const { muertos = null, heridos = null, nota_victimas = null } = verificado;
    if (muertos != null || heridos != null || nota_victimas) {
      return {
        muertos,
        heridos,
        tipo: "verificado",
        fuente: verificado.fuente_cifras ?? null,
        fecha: verificado.fecha_cifra ?? null,
        nota: nota_victimas,
      };
    }
  }
  if (wiki && (wiki.muertos != null || wiki.heridos != null)) {
    return {
      muertos: wiki.muertos,
      heridos: wiki.heridos,
      tipo: "wikipedia",
      fuente: { nombre: "Wikipedia (List of earthquakes)", url: urlPaginaWikipedia(anio) },
      fecha: consultaWiki,
      nota: wiki.compartida ? "Cifra conjunta con otro sismo del mismo día" : null,
    };
  }
  return SIN_REPORTES;
}

/** Suma solo cifras confirmadas (verificado o Wikipedia), nunca estimaciones. */
export function muertesConfirmadas(lista: { victimas: Victimas }[]): number {
  return lista.reduce((s, { victimas: v }) => s + (v.tipo !== "ninguna" && v.muertos ? v.muertos : 0), 0);
}
