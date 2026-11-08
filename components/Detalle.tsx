"use client";

import { useEffect, useState } from "react";
import type { Sismo } from "@/lib/tipos";
import { fechaISO, fechaLocal, fechaUTC, n0, n1 } from "./formato";

export type Nota = { titulo: string; medio: string; fecha: string | null; url: string; idioma: string | null; imagen: string | null; origen: "GDELT" | "Google Noticias" };
export type RespuestaNoticias = {
  notas: Nota[];
  videos: { id: string; titulo: string }[];
  busquedaYoutube: string;
  busquedaImagenes: string;
  avisos: string[];
};

const CATEGORIA: Record<string, string> = {
  subduccion: "de subducción",
  colision: "de colisión",
  dorsal: "de dorsal",
  transformante: "transformante",
};

function Cifra({ valor }: { valor: number | null }) {
  return valor == null ? <span className="apagado">Sin reportes</span> : <span className="num">{n0(valor)}</span>;
}

function FuenteCifra({ s }: { s: Sismo }) {
  const v = s.victimas;
  if (v.tipo === "ninguna") return null;
  const rotulo =
    v.tipo === "wikipedia"
      ? `recopilación de Wikipedia, consultada el ${fechaISO(v.fecha)}`
      : `${v.fuente?.nombre ?? "verificado a mano"}, cifra al ${fechaISO(v.fecha)}`;
  return (
    <p className="chico apagado">
      Fuente de víctimas:{" "}
      {v.fuente ? (
        <a href={v.fuente.url} target="_blank" rel="noopener noreferrer">
          {rotulo}
        </a>
      ) : (
        rotulo
      )}
      {v.nota ? `. ${v.nota}` : ""}
    </p>
  );
}

function Noticias({ s }: { s: Sismo }) {
  const [estado, setEstado] = useState<{ id: string; datos: RespuestaNoticias | null; error: boolean } | null>(null);

  useEffect(() => {
    let vivo = true;
    const id = s.id;
    fetch(`/api/noticias/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((datos: RespuestaNoticias) => vivo && setEstado({ id, datos, error: false }))
      .catch(() => vivo && setEstado({ id, datos: null, error: true }));
    return () => {
      vivo = false;
    };
  }, [s.id]);

  const cargando = !estado || estado.id !== s.id;
  const d = cargando ? null : estado.datos;
  const fotos = d?.notas.filter((n) => n.imagen).slice(0, 6) ?? [];

  return (
    <>
      <h3>Noticias</h3>
      {cargando && <p className="chico apagado">Cargando titulares…</p>}
      {!cargando && estado.error && <p className="chico apagado">No se pudieron cargar las noticias en este momento.</p>}
      {d && d.notas.length === 0 && <p className="chico apagado">Sin titulares encontrados para este sismo.</p>}
      {d && d.notas.length > 0 && (
        <ul className="noticias">
          {d.notas.slice(0, 8).map((n) => (
            <li key={n.url} className={n.imagen ? "" : "sin-imagen"}>
              {n.imagen && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.imagen} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
              )}
              <div>
                <a href={n.url} target="_blank" rel="noopener noreferrer">
                  {n.titulo}
                </a>
                <div className="chico apagado">
                  {n.medio}
                  {n.fecha ? ` · ${fechaISO(n.fecha)}` : ""} · vía {n.origen}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {d && d.avisos.length > 0 && <p className="chico apagado">{d.avisos.join(" ")}</p>}

      <h3>Videos</h3>
      {d && d.videos.length > 0 ? (
        <div className="videos">
          {d.videos.map((v) => (
            <iframe
              key={v.id}
              src={`https://www.youtube-nocookie.com/embed/${v.id}`}
              title={v.titulo}
              loading="lazy"
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ))}
        </div>
      ) : (
        <p className="chico">
          <a href={d?.busquedaYoutube ?? `https://www.youtube.com/results?search_query=${encodeURIComponent(s.busquedaNoticias)}`} target="_blank" rel="noopener noreferrer">
            Buscar videos en YouTube
          </a>
        </p>
      )}

      <h3>Fotos</h3>
      {fotos.length > 0 && (
        <ul className="enlaces" aria-label="Miniaturas de las notas">
          {fotos.map((n) => (
            <li key={n.url}>
              <a href={n.url} target="_blank" rel="noopener noreferrer" style={{ padding: 2, borderRadius: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={n.imagen!} alt={`Imagen de la nota: ${n.titulo}`} loading="lazy" referrerPolicy="no-referrer" width={96} height={64} style={{ objectFit: "cover", borderRadius: 4, display: "block" }} />
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="chico">
        <a href={d?.busquedaImagenes ?? `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(s.busquedaNoticias)}`} target="_blank" rel="noopener noreferrer">
          Buscar imágenes del sismo
        </a>
      </p>
    </>
  );
}

export default function Detalle({ s }: { s: Sismo | null }) {
  const [montado, setMontado] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  // La hora local depende del navegador del lector: se muestra solo después de hidratar.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMontado(true), []);

  if (!s) {
    return (
      <section className="detalle" id="detalle" aria-live="polite" aria-label="Detalle del sismo">
        <p>Toca o selecciona un sismo en el mapa o en la tabla para ver su detalle.</p>
      </section>
    );
  }
  const v = s.victimas;
  const compartir = async () => {
    const url = `${location.origin}${location.pathname}?sismo=${encodeURIComponent(s.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: `Sismo M${n1(s.mag)} – ${s.lugar}`, url });
      else await navigator.clipboard.writeText(url);
      setCopiadoId(s.id);
    } catch {
      /* el lector canceló */
    }
  };
  const placaTexto = s.limite
    ? `${s.limite.distanciaKm <= 5 ? "Junto al" : `A ${n0(s.limite.distanciaKm)} km del`} límite ${CATEGORIA[s.limite.categoria]} entre ${s.limite.placas[0]} y ${s.limite.placas[1]}${
        s.limite.velocidadMmAnio ? ` (≈ ${n0(s.limite.velocidadMmAnio)} mm/año)` : ""
      }`
    : "Sin dato";

  return (
    <section className="detalle" id="detalle" aria-live="polite" aria-label="Detalle del sismo" tabIndex={-1}>
      <div className="mag">M{n1(s.mag)}</div>
      <h2 style={{ marginTop: 8, fontSize: "1.25rem" }}>
        {s.lugar}
        {s.pais && !s.lugar.includes(s.pais) ? `, ${s.pais}` : ""}
      </h2>
      {s.lugarOriginal && <p className="chico apagado">USGS: «{s.lugarOriginal}»{s.magTipo ? ` · magnitud ${s.magTipo}` : ""}</p>}
      {s.menor && <p className="chico apagado">Sismo menor que el umbral del mapa, incluido porque dejó víctimas.</p>}
      {s.ubicacionAprox && <p className="chico apagado">Ubicación aproximada: no se encontró este sismo en el catálogo de USGS.</p>}

      <dl>
        <dt>Fecha (UTC)</dt>
        <dd>{fechaUTC(s.tiempo)}</dd>
        <dt>Tu hora local</dt>
        <dd>{montado ? fechaLocal(s.tiempo) : "…"}</dd>
        <dt>Profundidad</dt>
        <dd>{n0(s.profundidadKm)} km</dd>
        <dt>Muertos</dt>
        <dd>
          <Cifra valor={v.muertos} />
        </dd>
        <dt>Heridos</dt>
        <dd>
          <Cifra valor={v.heridos} />
        </dd>
        <dt>GEOFON</dt>
        <dd>
          {s.geofon ? (
            <a href={s.geofon.url} target="_blank" rel="noopener noreferrer">
              M{n1(s.geofon.mag)} {s.geofon.magTipo}
            </a>
          ) : (
            <span className="apagado">Sin cotejo</span>
          )}
        </dd>
        <dt>Tsunami</dt>
        <dd>
          {s.tsunamiTexto ?? (s.tsunamiUSGS ? "USGS activó su bandera de tsunami (indica que hay información de los centros de alerta, no que hubo olas)" : "Sin bandera de tsunami de USGS")}
        </dd>
        <dt>Alertas</dt>
        <dd>
          {s.estimaciones.length === 0 && <span className="apagado">Sin alerta de PAGER ni GDACS</span>}
          {s.estimaciones.map((e) => (
            <div key={e.fuente}>
              <span className="etiqueta-estimacion">Estimación</span>
              <a href={e.url} target="_blank" rel="noopener noreferrer">
                {e.texto}
              </a>
            </div>
          ))}
        </dd>
      </dl>
      <FuenteCifra s={s} />

      <h3>Qué pasó</h3>
      {s.resumen ? (
        <p>
          {s.resumen}
          {s.resumenFuente && (
            <>
              {" "}
              <a href={s.resumenFuente.url} target="_blank" rel="noopener noreferrer" className="chico">
                ({s.resumenFuente.nombre})
              </a>
            </>
          )}
        </p>
      ) : (
        <p className="apagado">Aún no hay un resumen verificado para este sismo; las cifras de arriba vienen de las fuentes enlazadas.</p>
      )}

      <h3>Por qué aquí</h3>
      <p>
        {s.porQueAqui}
        {s.porQueAquiAuto && <span className="chico apagado"> (texto automático a partir de PB2002 y USGS)</span>}
      </p>
      <p className="chico">
        <strong>Entorno:</strong> {s.entorno}. <strong>Límite más cercano:</strong> {placaTexto}.
      </p>
      {s.fuenteExtra && (
        <p className="chico">
          Más contexto:{" "}
          <a href={s.fuenteExtra.url} target="_blank" rel="noopener noreferrer">
            {s.fuenteExtra.nombre}
          </a>
        </p>
      )}

      <ul className="enlaces">
        {s.urlUSGS && (
          <li>
            <a href={s.urlUSGS} target="_blank" rel="noopener noreferrer">
              Ficha del USGS
            </a>
          </li>
        )}
        {s.gdacs && (
          <li>
            <a href={s.gdacs.url} target="_blank" rel="noopener noreferrer">
              Informe de GDACS
            </a>
          </li>
        )}
        <li>
          <button type="button" onClick={compartir}>
            {copiadoId === s.id ? "Enlace copiado" : "Compartir este sismo"}
          </button>
        </li>
      </ul>

      <Noticias s={s} />
    </section>
  );
}
