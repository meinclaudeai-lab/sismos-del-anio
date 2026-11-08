import { MIN_MAG } from "./config";
import { emparejar, emparejarWikipedia, MAX_DT_CATALOGO_S, MAX_DIST_KM } from "./emparejar";
import { calcularEntorno, normalizarEntorno } from "./entorno";
import { catalogoEMSC, catalogoGEOFON, urlEMSC, urlEventoEMSC, urlEventoGEOFON, urlGEOFON } from "./fuentes/catalogos";
import { eventosGDACS, NIVEL_GDACS_ES, poblacionGDACS, urlGDACS } from "./fuentes/gdacs";
import { catalogoUSGS, estimacionPAGER, urlCatalogoUSGS, usgsDelDia } from "./fuentes/usgs";
import { filasWikipedia, urlPaginaWikipedia } from "./fuentes/wikipedia";
import { traducirLugar } from "./lugar";
import { IndicePlacas, type Tramo } from "./placas";
import { porQueAquiAuto } from "./porque";
import { detectarSecuencias } from "./secuencias";
import type {
  Datos, Enlace, EstadoFuente, Estimacion, EventoCatalogo, EventoGDACS, EventoUSGS, FilaWikipedia, LineaBase, Sismo,
} from "./tipos";
import { elegirVictimas, type RegistroVerificado } from "./victimas";
import tramos from "../data/placas-pb2002.json";
import verificadoJSON from "../data/verificado.json";
import lineaBaseJSON from "../data/linea-base-m7.json";

export type Verificado = RegistroVerificado & {
  id_provisional?: string | null;
  fecha_utc?: string;
  lat?: number;
  lon?: number;
  ubicacion_aprox?: boolean;
  magnitud_usgs?: number;
  magnitud_geofon?: number | null;
  profundidad_km?: number;
  lugar?: string | null;
  pais?: string | null;
  resumen?: string | null;
  tsunami?: string | null;
  por_que_aqui?: string | null;
  entorno?: string | null;
  fuente_extra?: Enlace | null;
  busqueda_noticias?: string | null;
};

const VERIFICADO = verificadoJSON as unknown as {
  sismos: Record<string, Verificado>;
  evidencia: Datos["evidencia"];
  referencias: Datos["referencias"];
};
const LINEA_BASE = lineaBaseJSON as LineaBase;

let indice: IndicePlacas | null = null;
const indicePlacas = () => (indice ??= new IndicePlacas(tramos as Tramo[]));

function estado(id: string, nombre: string, url: string, r: PromiseSettledResult<unknown>, detalleOk: string): EstadoFuente {
  return r.status === "fulfilled"
    ? { id, nombre, url, ok: true, detalle: detalleOk }
    : { id, nombre, url, ok: false, detalle: String((r.reason as Error)?.message ?? r.reason).slice(0, 120) };
}

const valor = <T,>(r: PromiseSettledResult<T>, porDefecto: T): T => (r.status === "fulfilled" ? r.value : porDefecto);

/** Sismos menores con víctimas según Wikipedia, emparejados con USGS por día, magnitud y país. */
async function menoresConVictimas(filas: FilaWikipedia[], minMag: number) {
  const candidatas = filas.filter((f) => (f.muertos ?? 0) > 0 && f.mag < minMag);
  const res = await Promise.allSettled(candidatas.map((f) => usgsDelDia(f.fecha, Math.max(2.5, f.mag - 0.5))));
  const out: { fila: FilaWikipedia; usgs: EventoUSGS | null }[] = [];
  candidatas.forEach((fila, i) => {
    const lista = valor(res[i], [] as EventoUSGS[]);
    const par = emparejarWikipedia(lista, [fila]);
    out.push({ fila, usgs: [...par.keys()][0] ?? null });
  });
  return out;
}

function base(e: EventoUSGS, menor: boolean): Omit<Sismo, "victimas" | "estimaciones" | "lugar" | "pais" | "entorno" | "limite" | "porQueAqui" | "porQueAquiAuto" | "resumen" | "resumenFuente" | "tsunamiTexto" | "fuenteExtra" | "busquedaNoticias"> {
  return {
    id: e.id,
    tiempo: e.tiempo,
    lat: e.lat,
    lon: e.lon,
    profundidadKm: Math.round(e.profundidadKm * 10) / 10,
    mag: e.mag,
    magTipo: e.magTipo,
    lugarOriginal: e.lugar,
    ubicacionAprox: false,
    menor,
    urlUSGS: e.url,
    tsunamiUSGS: e.tsunami,
    alertaPAGER: e.alerta,
    sig: e.sig,
    felt: e.felt,
    geofon: null,
    emsc: null,
    gdacs: null,
    secuencia: null,
  };
}

const fechaES = (t: number) =>
  new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(t);

/** Texto de búsqueda de noticias para sismos sin texto verificado: «sismo 6.5 Japón 25 de octubre de 2026». */
export const busquedaAuto = (mag: number, pais: string, t: number) => `sismo ${mag.toFixed(1)} ${pais} ${fechaES(t)}`;

export async function obtenerDatos(anio: number, minMag = MIN_MAG): Promise<Datos> {
  const consulta = new Date().toISOString();
  const [rUSGS, rGEOFON, rEMSC, rGDACS, rWiki] = await Promise.allSettled([
    catalogoUSGS(anio, minMag),
    catalogoGEOFON(anio, Math.min(6, minMag)),
    catalogoEMSC(anio, Math.min(6, minMag)),
    eventosGDACS(anio),
    filasWikipedia(anio),
  ]);
  // Sin USGS no hay página: se lanza para que Vercel siga sirviendo la última versión buena.
  if (rUSGS.status === "rejected") throw new Error(`USGS no respondió: ${(rUSGS.reason as Error)?.message}`);
  const usgs = rUSGS.value;
  const geofon = valor(rGEOFON, [] as EventoCatalogo[]);
  const emsc = valor(rEMSC, [] as EventoCatalogo[]);
  const gdacs = valor(rGDACS, [] as EventoGDACS[]);
  const wiki = valor(rWiki, [] as FilaWikipedia[]);

  // --- Sismos menores con víctimas ---
  const idsCatalogo = new Set(usgs.map((e) => e.id));
  const menores = await menoresConVictimas(wiki, minMag);
  const eventosMenores: EventoUSGS[] = [];
  const aproximados: { fila: FilaWikipedia | null; v: Verificado; id: string }[] = [];
  for (const { usgs: e } of menores) {
    if (e && !idsCatalogo.has(e.id)) {
      eventosMenores.push(e);
      idsCatalogo.add(e.id);
    }
  }
  // Menores del archivo verificado que no llegaron por Wikipedia (o sin id de USGS).
  for (const [id, v] of Object.entries(VERIFICADO.sismos)) {
    if (idsCatalogo.has(id) || !v.fecha_utc?.startsWith(String(anio))) continue;
    if ((v.magnitud_usgs ?? 0) >= minMag || !(v.muertos && v.muertos > 0)) continue;
    if (v.lat == null || v.lon == null) continue;
    aproximados.push({ fila: null, v, id });
    idsCatalogo.add(id);
  }

  const todos = [...usgs, ...eventosMenores];

  // --- Emparejamientos ---
  const parGEOFON = emparejar(todos, geofon, MAX_DT_CATALOGO_S, MAX_DIST_KM);
  const parEMSC = emparejar(todos, emsc, MAX_DT_CATALOGO_S, MAX_DIST_KM);
  const parGDACS = emparejar(todos, gdacs, MAX_DT_CATALOGO_S, MAX_DIST_KM);
  const parWiki = emparejarWikipedia(todos, wiki);

  // --- Estimaciones (PAGER solo con alerta ≥ amarilla; población GDACS para naranja/roja) ---
  const conPAGER = todos.filter((e) => e.alerta && e.alerta !== "green");
  const conGDACSDetalle = [...parGDACS.entries()].filter(([, g]) => g.alerta !== "Green");
  const [rPAGER, rPob] = await Promise.all([
    Promise.allSettled(conPAGER.map((e) => estimacionPAGER(e.id, e.url))),
    Promise.allSettled(conGDACSDetalle.map(([, g]) => poblacionGDACS(g.detalles))),
  ]);
  const pager = new Map<string, Estimacion>();
  conPAGER.forEach((e, i) => {
    const est = valor(rPAGER[i], null);
    if (est) pager.set(e.id, est);
  });
  const poblacion = new Map<EventoGDACS, string>();
  conGDACSDetalle.forEach(([, g], i) => {
    const p = valor(rPob[i], null);
    if (p) poblacion.set(g, p);
  });

  const ip = indicePlacas();
  const consultaWiki = rWiki.status === "fulfilled" ? consulta.slice(0, 10) : null;

  const construir = (b: ReturnType<typeof base>, v: Verificado | undefined, fw: FilaWikipedia | undefined): Sismo => {
    const tr = traducirLugar(b.lugarOriginal);
    const { limite, entorno: entAuto } = calcularEntorno(ip, b.lat, b.lon, b.profundidadKm);
    const entorno = normalizarEntorno(v?.entorno) ?? entAuto;
    const lugar = v?.lugar ?? tr.lugar;
    const pais = v?.pais ?? tr.pais;
    return {
      ...b,
      lugar,
      pais,
      victimas: elegirVictimas(v, fw, anio, consultaWiki),
      estimaciones: [],
      resumen: v?.resumen ?? null,
      resumenFuente: v?.resumen ? (v.fuente_cifras ?? null) : null,
      porQueAqui: v?.por_que_aqui ?? porQueAquiAuto(b.profundidadKm, limite, entorno),
      porQueAquiAuto: !v?.por_que_aqui,
      fuenteExtra: v?.fuente_extra ?? null,
      tsunamiTexto: v?.tsunami ?? null,
      limite,
      entorno,
      busquedaNoticias: v?.busqueda_noticias ?? busquedaAuto(b.mag, pais || lugar, b.tiempo),
    };
  };

  const sismos: Sismo[] = todos.map((e) => {
    const s = construir(base(e, e.mag < minMag), VERIFICADO.sismos[e.id], parWiki.get(e));
    const g = parGEOFON.get(e);
    if (g) s.geofon = { id: g.id, mag: g.mag, magTipo: g.magTipo, url: urlEventoGEOFON(g.id) };
    const m = parEMSC.get(e);
    if (m) s.emsc = { id: m.id, mag: m.mag, url: urlEventoEMSC(m.id) };
    const gd = parGDACS.get(e);
    if (gd) s.gdacs = { alerta: gd.alerta, url: gd.url, poblacion: poblacion.get(gd) ?? null };
    const p = pager.get(e.id);
    if (p) s.estimaciones.push(p);
    if (gd && gd.alerta !== "Green") {
      const nivel = NIVEL_GDACS_ES[gd.alerta] ?? gd.alerta;
      s.estimaciones.push({
        fuente: "GDACS",
        nivel,
        texto: `Alerta humanitaria ${nivel} de GDACS${s.gdacs?.poblacion ? `: ${s.gdacs.poblacion}` : ""}`,
        url: gd.url,
      });
    }
    return s;
  });

  for (const { v, id } of aproximados) {
    const t = Date.parse(v.fecha_utc!.length <= 10 ? `${v.fecha_utc}T00:00:00Z` : v.fecha_utc!.replace(/Z?$/, "Z"));
    const b = base(
      { id, tiempo: t, lat: v.lat!, lon: v.lon!, profundidadKm: v.profundidad_km ?? 10, mag: v.magnitud_usgs ?? 0, magTipo: "", lugar: v.lugar ?? "", url: "", tsunami: false, alerta: null, sig: 0, felt: null },
      true,
    );
    sismos.push({ ...construir({ ...b, urlUSGS: null, ubicacionAprox: v.ubicacion_aprox ?? true }, v, undefined), lugarOriginal: "" });
  }
  // Menores de Wikipedia sin sismo de USGS y sin registro verificado: no tienen coordenadas,
  // así que no se pueden ubicar en el mapa y no se inventan.

  sismos.sort((a, b) => b.tiempo - a.tiempo);

  const principales = sismos.filter((s) => !s.menor);
  const secuencias = detectarSecuencias(principales);
  for (const sec of secuencias) for (const id of sec.sismos) sismos.find((s) => s.id === id)!.secuencia = sec.id;

  const fuentes: EstadoFuente[] = [
    { id: "usgs", nombre: "USGS ComCat", url: urlCatalogoUSGS(anio, minMag), ok: true, detalle: `${usgs.length} sismos M${minMag}+` },
    estado("geofon", "GEOFON (GFZ)", urlGEOFON(anio, 6), rGEOFON, `${parGEOFON.size} cotejados`),
    estado("emsc", "EMSC", urlEMSC(anio, 6), rEMSC, `${parEMSC.size} cotejados`),
    estado("gdacs", "GDACS", urlGDACS(anio), rGDACS, `${parGDACS.size} con alerta`),
    estado("wikipedia", "Wikipedia", urlPaginaWikipedia(anio), rWiki, `${parWiki.size} filas emparejadas`),
  ];
  if (rWiki.status === "fulfilled" && wiki.length === 0)
    Object.assign(fuentes[4], { ok: false, detalle: "La página respondió pero no se pudieron leer sus tablas" });

  return {
    anio,
    minMag,
    generado: consulta,
    esRespaldo: false,
    sismos,
    fuentes,
    secuencias,
    lineaBase: LINEA_BASE,
    evidencia: VERIFICADO.evidencia,
    referencias: VERIFICADO.referencias,
    wikipediaConsultada: consultaWiki,
  };
}

