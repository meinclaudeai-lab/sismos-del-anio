import type { Entorno } from "./entorno";
import type { LimiteCercano } from "./placas";

export type Enlace = { nombre: string; url: string };

/** Evento de catálogo normalizado (USGS, GEOFON o EMSC). */
export type EventoCatalogo = {
  id: string;
  tiempo: number; // ms UTC
  lat: number;
  lon: number;
  profundidadKm: number;
  mag: number;
  magTipo: string;
  lugar: string;
};

export type EventoUSGS = EventoCatalogo & {
  url: string;
  tsunami: boolean;
  alerta: string | null;
  sig: number;
  felt: number | null;
};

export type EventoGDACS = {
  eventid: number;
  tiempo: number;
  lat: number;
  lon: number;
  mag: number;
  alerta: string; // Green | Orange | Red
  pais: string;
  url: string;
  detalles: string;
  poblacion?: string | null;
};

export type FilaWikipedia = {
  fecha: string; // AAAA-MM-DD (UTC)
  lugar: string;
  pais: string; // primer segmento del lugar, en inglés
  mag: number;
  profundidadKm: number | null;
  muertos: number | null;
  heridos: number | null;
  /** La cifra de víctimas está en una celda compartida con otro sismo del mismo día. */
  compartida: boolean;
};

export type TipoCifra = "verificado" | "wikipedia" | "ninguna";

export type Victimas = {
  muertos: number | null;
  heridos: number | null;
  tipo: TipoCifra;
  fuente: Enlace | null;
  fecha: string | null; // fecha de la cifra o de la consulta
  nota: string | null;
};

export type Estimacion = {
  fuente: "PAGER" | "GDACS";
  nivel: string; // verde/amarilla/naranja/roja
  texto: string;
  url: string;
};

export type Sismo = {
  id: string;
  tiempo: number;
  lat: number;
  lon: number;
  profundidadKm: number;
  mag: number;
  magTipo: string;
  lugarOriginal: string;
  lugar: string;
  pais: string;
  ubicacionAprox: boolean;
  menor: boolean; // magnitud < MIN_MAG, incluido por víctimas
  urlUSGS: string | null;
  tsunamiUSGS: boolean;
  tsunamiTexto: string | null;
  alertaPAGER: string | null;
  sig: number | null;
  felt: number | null;
  geofon: { id: string; mag: number; magTipo: string; url: string } | null;
  emsc: { id: string; mag: number; url: string } | null;
  gdacs: { alerta: string; url: string; poblacion: string | null } | null;
  victimas: Victimas;
  estimaciones: Estimacion[];
  resumen: string | null;
  resumenFuente: Enlace | null;
  porQueAqui: string;
  porQueAquiAuto: boolean;
  fuenteExtra: Enlace | null;
  limite: LimiteCercano | null;
  entorno: Entorno;
  busquedaNoticias: string;
  secuencia: number | null;
};

export type EstadoFuente = {
  id: string;
  nombre: string;
  url: string;
  ok: boolean;
  detalle: string;
};

export type Secuencia = {
  id: number;
  nombre: string;
  sismos: string[];
  inicio: number;
  fin: number;
  magMax: number;
};

export type LineaBase = {
  generado: string;
  desde: number;
  hasta: number;
  fuente: string;
  conteos: { anio: number; m7: number }[];
};

export type Evidencia = { id: string; tema: string; hallazgo: string; fuente: string; url: string };
export type Referencia = { id: string; concepto: string; valor: number; fuente: string; url: string };

export type Datos = {
  anio: number;
  minMag: number;
  generado: string;
  esRespaldo: boolean;
  sismos: Sismo[];
  fuentes: EstadoFuente[];
  secuencias: Secuencia[];
  lineaBase: LineaBase;
  evidencia: Evidencia[];
  referencias: Referencia[];
  wikipediaConsultada: string | null;
};
