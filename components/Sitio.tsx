"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calcularCifras, fraseConclusion, textoPatron } from "@/lib/resumen";
import type { Datos, Sismo } from "@/lib/tipos";
import Detalle from "./Detalle";
import { fechaCorta, fechaISO, MESES, n0, n1 } from "./formato";
import Graficas from "./Graficas";
import Mapa, { LeyendaMapa } from "./Mapa";
import Tabla from "./Tabla";

type Filtro = "todos" | "m7" | "muertes";

function fechaHora(iso: string) {
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" }).format(new Date(iso)) + " UTC";
}

export default function Sitio({ inicial }: { inicial: Datos }) {
  const [datos, setDatos] = useState(inicial);
  const [errorAnio, setErrorAnio] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [limites, setLimites] = useState(true);
  const ultimoMes = useMemo(
    () => (datos.anio < new Date(datos.generado).getUTCFullYear() ? 12 : new Date(datos.generado).getUTCMonth() + 1),
    [datos],
  );
  const [mes, setMes] = useState(ultimoMes);
  const [reproduciendo, setReproduciendo] = useState(false);
  const porDefecto = useMemo(() => datos.sismos.find((s) => !s.menor)?.id ?? null, [datos]);
  const [seleccion, setSeleccion] = useState<string | null>(porDefecto);
  const detalleRef = useRef<HTMLDivElement>(null);

  const cifras = useMemo(() => calcularCifras(datos), [datos]);
  const patron = useMemo(() => textoPatron(datos, cifras), [datos, cifras]);

  // Lee ?sismo= y ?año= al cargar.
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const anio = Number(p.get("año") ?? p.get("anio"));
    const id = p.get("sismo");
    if (anio && anio !== inicial.anio) {
      fetch(`/api/sismos?año=${anio}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d: Datos) => {
          setDatos(d);
          setMes(12);
          setSeleccion(id && d.sismos.some((s) => s.id === id) ? id : (d.sismos.find((s) => !s.menor)?.id ?? null));
        })
        .catch(() => setErrorAnio(`No se pudieron cargar los datos de ${anio}; se muestra ${inicial.anio}.`));
    } else if (id && inicial.sismos.some((s) => s.id === id)) {
      setSeleccion(id);
      requestAnimationFrame(() => document.getElementById("detalle")?.scrollIntoView({ block: "start" }));
    }
  }, [inicial]);

  useEffect(() => setMes(ultimoMes), [ultimoMes]);

  // Reproducir el año mes a mes.
  useEffect(() => {
    if (!reproduciendo) return;
    const id = setInterval(() => {
      setMes((m) => {
        if (m >= ultimoMes) {
          setReproduciendo(false);
          return ultimoMes;
        }
        return m + 1;
      });
    }, 900);
    return () => clearInterval(id);
  }, [reproduciendo, ultimoMes]);

  const visibles = useMemo(
    () =>
      datos.sismos.filter((s) => {
        if (new Date(s.tiempo).getUTCMonth() + 1 > mes) return false;
        if (filtro === "m7") return s.mag >= 7;
        if (filtro === "muertes") return (s.victimas.muertos ?? 0) > 0;
        return true;
      }),
    [datos, filtro, mes],
  );

  const seleccionar = useCallback((id: string, desplazar = false) => {
    setSeleccion(id);
    const url = new URL(location.href);
    url.searchParams.set("sismo", id);
    history.replaceState(null, "", url);
    if (desplazar && window.matchMedia("(max-width: 960px)").matches) {
      detalleRef.current?.querySelector<HTMLElement>("#detalle")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const sel: Sismo | null = datos.sismos.find((s) => s.id === seleccion) ?? null;
  const caidas = datos.fuentes.filter((f) => !f.ok);
  const usgs = datos.fuentes.find((f) => f.id === "usgs")!;

  return (
    <>
      <a className="saltar" href="#mapa">
        Saltar al mapa
      </a>
      <header className="contenedor encabezado">
        <h1>Sismos del año {datos.anio}</h1>
        <p className="conclusion">{fraseConclusion(datos, cifras)}</p>
        <p className="chico apagado" style={{ margin: 0 }}>
          Actualizado: {fechaHora(datos.generado)}
          {datos.esRespaldo && " · datos de respaldo: USGS no respondió en la última actualización"}
        </p>
        <ul className="estado-fuentes" aria-label="Estado de las fuentes">
          {datos.fuentes.map((f) => (
            <li key={f.id} title={f.detalle}>
              <span className={`punto ${f.ok ? "ok" : "falla"}`} aria-hidden="true" />
              <a href={f.url} target="_blank" rel="noopener noreferrer">
                {f.nombre}
              </a>
              <span>{f.ok ? "responde" : "sin respuesta"}</span>
            </li>
          ))}
        </ul>
        {caidas.length > 0 && (
          <p className="aviso" role="status">
            {caidas.map((f) => f.nombre).join(", ")} no respondi{caidas.length > 1 ? "eron" : "ó"} en la última actualización. La página
            usa las demás fuentes; algunos datos pueden faltar.
          </p>
        )}
        {errorAnio && (
          <p className="aviso" role="status">
            {errorAnio}
          </p>
        )}
      </header>

      <main>
        <section className="contenedor" aria-labelledby="t-cifras">
          <h2 id="t-cifras" className="sr-only">
            Cifras clave
          </h2>
          <ul className="cifras">
            <li className="cifra">
              <div className="valor">{n0(cifras.totalPrincipales)}</div>
              <div className="etiqueta">sismos de magnitud {n1(datos.minMag)} o más</div>
              <div className="fuente">
                <a href={usgs.url} target="_blank" rel="noopener noreferrer">
                  USGS ComCat
                </a>
              </div>
            </li>
            <li className="cifra">
              <div className="valor">
                {n0(cifras.m7)} <span style={{ fontSize: "0.55em", fontWeight: 500 }} className="apagado">/ {n0(cifras.ritmo.esperadoALaFecha)} esperados</span>
              </div>
              <div className="etiqueta">sismos M7+ frente al promedio a la fecha</div>
              <div className="fuente">
                Promedio {n1(cifras.ritmo.promedio)}/año, {datos.lineaBase.desde}–{datos.lineaBase.hasta},{" "}
                <a href="https://earthquake.usgs.gov/fdsnws/event/1/" target="_blank" rel="noopener noreferrer">
                  USGS
                </a>
              </div>
            </li>
            <li className="cifra">
              <div className="valor">{n0(cifras.muertes)}</div>
              <div className="etiqueta">muertes confirmadas en {cifras.conMuertes} sismos</div>
              <div className="fuente">Verificadas o de Wikipedia; sin estimaciones. Fuente en cada sismo.</div>
            </li>
            <li className="cifra">
              <div className="valor">{cifras.maxima ? `M${n1(cifras.maxima.mag)}` : "—"}</div>
              <div className="etiqueta">magnitud máxima{cifras.maxima ? `: ${cifras.maxima.pais || cifras.maxima.lugar}` : ""}</div>
              <div className="fuente">
                {cifras.maxima?.urlUSGS && (
                  <a href={cifras.maxima.urlUSGS} target="_blank" rel="noopener noreferrer">
                    Ficha USGS, {fechaCorta(cifras.maxima.tiempo)}
                  </a>
                )}
              </div>
            </li>
          </ul>
        </section>

        <section className="contenedor seccion" style={{ borderTop: 0 }} id="mapa" aria-labelledby="t-mapa">
          <h2 id="t-mapa">Mapa</h2>
          <div className="controles">
            <div className="grupo" role="group" aria-label="Filtrar sismos">
              {(
                [
                  ["todos", "Todos"],
                  ["m7", "M7+"],
                  ["muertes", "Con muertes"],
                ] as const
              ).map(([v, t]) => (
                <button key={v} type="button" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>
                  {t}
                </button>
              ))}
            </div>
            <label className="interruptor">
              <input type="checkbox" checked={limites} onChange={(e) => setLimites(e.target.checked)} />
              Límites de placas
            </label>
            <div className="meses">
              <button
                type="button"
                className="boton"
                onClick={() => {
                  if (!reproduciendo && mes >= ultimoMes) setMes(1);
                  setReproduciendo((r) => !r);
                }}
                aria-label={reproduciendo ? "Pausar la reproducción del año" : "Reproducir el año mes a mes"}
              >
                {reproduciendo ? "❚❚ Pausa" : "▶ Reproducir"}
              </button>
              <input
                type="range"
                min={1}
                max={ultimoMes}
                value={mes}
                onChange={(e) => {
                  setReproduciendo(false);
                  setMes(Number(e.target.value));
                }}
                aria-label="Mostrar sismos hasta el mes"
                aria-valuetext={`Hasta ${MESES[mes - 1]}`}
              />
              <output aria-live="off">
                {mes >= ultimoMes ? "Todo el año" : `Hasta ${MESES[mes - 1]}`} · {visibles.length}
              </output>
            </div>
          </div>
          <div className="explorador">
            <div style={{ minWidth: 0 }}>
              <Mapa sismos={visibles} seleccion={seleccion} mostrarLimites={limites} onSeleccionar={(id) => seleccionar(id, true)} />
              <LeyendaMapa mostrarLimites={limites} />
              <p className="pista">Arrastra para mover. Para acercar usa los botones, Ctrl + rueda o pellizca con dos dedos.</p>
            </div>
            <div ref={detalleRef} style={{ minWidth: 0 }}>
              <Detalle s={sel} />
            </div>
          </div>
        </section>

        <section className="contenedor seccion" aria-labelledby="t-tabla">
          <h2 id="t-tabla">Todos los sismos</h2>
          <p className="chico apagado">
            {visibles.length} sismos con los filtros actuales. Toca una fila para ver el detalle; los encabezados ordenan la tabla.
          </p>
          <Tabla
            sismos={visibles}
            seleccion={seleccion}
            onSeleccionar={(id) => {
              seleccionar(id);
              document.getElementById("detalle")?.scrollIntoView({ behavior: "smooth", block: "start" });
              document.getElementById("detalle")?.focus({ preventScroll: true });
            }}
          />
        </section>

        <section className="contenedor seccion" aria-labelledby="t-patron">
          <h2 id="t-patron">¿Hay un patrón o una tendencia?</h2>
          <div className="metodo">
            <p>{patron.patron}</p>
            <p>{patron.tendencia}</p>
            <p className="chico apagado">
              Referencia: el USGS cita unos {datos.referencias.find((r) => r.id === "prom_m7")?.valor ?? 16} sismos M7+ al año en promedio desde ~1900 (
              <a href={datos.referencias.find((r) => r.id === "prom_m7")?.url} target="_blank" rel="noopener noreferrer">
                USGS
              </a>
              ). El conteo de esta página usa el catálogo ComCat actual, que puede diferir algo de esa cifra histórica.
            </p>
          </div>
          <Graficas d={datos} c={cifras} />
          <h3 style={{ marginTop: 28 }}>Secuencias detectadas</h3>
          <p className="chico apagado">Sismos a menos de 300 km y 60 días entre sí: réplicas o secuencias de una misma zona.</p>
          {datos.secuencias.length === 0 ? (
            <p>No se detectaron secuencias.</p>
          ) : (
            <ul className="secuencias">
              {datos.secuencias.map((q) => (
                <li key={q.id}>
                  <strong>{q.nombre}</strong>: {q.sismos.length} sismos {fechaCorta(q.inicio) === fechaCorta(q.fin) ? `el ${fechaCorta(q.inicio)}` : `entre el ${fechaCorta(q.inicio)} y el ${fechaCorta(q.fin)}`}, máximo M{n1(q.magMax)}.{" "}
                  <button type="button" className="boton" style={{ minHeight: 28, padding: "2px 10px" }} onClick={() => {
                    setFiltro("todos");
                    setMes(ultimoMes);
                    seleccionar(q.sismos.reduce((a, b) => ((datos.sismos.find((s) => s.id === b)?.mag ?? 0) > (datos.sismos.find((s) => s.id === a)?.mag ?? 0) ? b : a)));
                    document.getElementById("mapa")?.scrollIntoView({ behavior: "smooth" });
                  }}>
                    Ver en el mapa
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="contenedor seccion" aria-labelledby="t-fuentes">
          <h2 id="t-fuentes">Qué dicen las fuentes</h2>
          <ul className="tarjetas">
            {datos.evidencia.map((e) => (
              <li key={e.id} className="tarjeta">
                <h3>{e.tema}</h3>
                <p>{e.hallazgo}</p>
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="chico">
                  {e.fuente}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="contenedor seccion" aria-labelledby="t-metodo">
          <h2 id="t-metodo">Cómo se arma</h2>
          <div className="metodo">
            <ul>
              <li>
                <strong>Catálogo base:</strong> USGS ComCat, sismos de magnitud {n1(datos.minMag)} o más desde el 1 de enero de {datos.anio}. Se cotejan
                con GEOFON (GFZ) y EMSC cuando coinciden a menos de 90 s y 150 km.
              </li>
              <li>
                <strong>Víctimas:</strong> primero las cifras verificadas a mano (con su fuente y fecha); si no hay, la recopilación de Wikipedia
                (emparejada por día, magnitud y país, porque sus tablas no dan hora ni coordenadas); si no, «Sin reportes». Las estimaciones de PAGER
                (USGS) y GDACS se muestran aparte y nunca se suman a las muertes confirmadas.
              </li>
              <li>
                <strong>Sismos menores:</strong> se añaden los de magnitud menor al umbral que dejaron muertos según Wikipedia, ubicados con su registro
                de USGS.
              </li>
              <li>
                <strong>Entorno tectónico:</strong> distancia al tramo más cercano del modelo PB2002. Subducción si hay una fosa a ≤ 250 km; si no, la
                clase del tramo a ≤ 150 km; profundo si está a más de 300 km del límite y a más de 300 km de profundidad; si no, fallas en la corteza.
              </li>
              <li>
                <strong>Esperado a la fecha:</strong> promedio anual de M7+ entre {datos.lineaBase.desde} y {datos.lineaBase.hasta} × fracción del año
                transcurrida.
              </li>
              <li>
                <strong>Actualización:</strong> la página se regenera como máximo cada 15 minutos; USGS se consulta cada 10 min y las demás fuentes cada 1 a
                6 horas.
              </li>
              <li>
                <strong>Limitaciones:</strong> las cifras de víctimas cambian durante semanas; las magnitudes y ubicaciones pueden revisarse; la heurística
                de entorno es una simplificación. Corrección de datos: <code>data/verificado.json</code> en el repositorio.
              </li>
            </ul>
            <p className="chico">
              <strong>Fuentes y licencias.</strong> Datos de{" "}
              <a href="https://earthquake.usgs.gov/" target="_blank" rel="noopener noreferrer">USGS</a> (dominio público),{" "}
              <a href="https://geofon.gfz.de/" target="_blank" rel="noopener noreferrer">GFZ/GEOFON</a>,{" "}
              <a href="https://www.emsc-csem.org/" target="_blank" rel="noopener noreferrer">EMSC</a>,{" "}
              <a href="https://www.gdacs.org/" target="_blank" rel="noopener noreferrer">GDACS</a> (UE/ONU),{" "}
              <a href={`https://en.wikipedia.org/wiki/List_of_earthquakes_in_${datos.anio}`} target="_blank" rel="noopener noreferrer">Wikipedia</a>{" "}
              (<a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
              {datos.wikipediaConsultada ? `, consultada el ${fechaISO(datos.wikipediaConsultada)}` : ""}). Límites de placas: modelo PB2002 de Bird (2003),{" "}
              <a href="https://doi.org/10.1029/2001GC000252" target="_blank" rel="noopener noreferrer">doi:10.1029/2001GC000252</a>, vía{" "}
              <a href="https://github.com/fraxen/tectonicplates" target="_blank" rel="noopener noreferrer">fraxen/tectonicplates</a> (ODC-BY). Países:{" "}
              <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a> (dominio público) vía world-atlas.
              Noticias: <a href="https://www.gdeltproject.org/" target="_blank" rel="noopener noreferrer">GDELT</a> y Google Noticias; solo se muestran
              títulos, medio, fecha y enlace.
            </p>
          </div>
        </section>
      </main>
      <footer className="contenedor pie">
        Proyecto informativo. Ante un sismo, sigue las indicaciones de la protección civil de tu país. Ninguna cifra de esta página es una predicción.
      </footer>
    </>
  );
}

