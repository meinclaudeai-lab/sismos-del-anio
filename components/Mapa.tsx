"use client";

import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { useEffect, useMemo, useRef, useState } from "react";
import { H, proyeccion, W } from "@/lib/proyeccion";
import type { Sismo } from "@/lib/tipos";
import { claseProfundidad, fechaCorta, n0, n1, radioMagnitud } from "./formato";

/** Trazos precalculados por scripts/mapa.ts con la misma proyección. */
type Rutas = { esfera: string; graticula: string; tierra: string; fronteras: string; placas: { cat: string; d: string }[] };

/** Radio mínimo de toque, en píxeles de pantalla (24 px de diámetro como mínimo). */
const TOQUE_PX = 14;

export default function Mapa({
  sismos,
  seleccion,
  mostrarLimites,
  onSeleccionar,
}: {
  sismos: Sismo[];
  seleccion: string | null;
  mostrarLimites: boolean;
  onSeleccionar: (id: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const [rutas, setRutas] = useState<Rutas | null>(null);
  const [hover, setHover] = useState<{ s: Sismo; x: number; y: number } | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/mapa-rutas.json")
      .then((r) => r.json())
      .then((r: Rutas) => vivo && setRutas(r))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current!;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .translateExtent([
        [0, 0],
        [W, H],
      ])
      // Rueda solo con Ctrl/⌘ y, en pantallas táctiles, solo con dos dedos: así el mapa no atrapa
      // el desplazamiento vertical de la página.
      .filter((ev: Event) => {
        if (ev.type === "wheel") return (ev as WheelEvent).ctrlKey || (ev as WheelEvent).metaKey;
        if (ev.type.startsWith("touch")) return (ev as TouchEvent).touches.length >= 2;
        return !(ev as MouseEvent).button;
      })
      .on("zoom", (ev) => setT(ev.transform));
    const sel = select(svg);
    sel.call(z).on("dblclick.zoom", null);
    sel.style("touch-action", "pan-x pan-y");
    zoomRef.current = z;
    return () => {
      sel.on(".zoom", null);
    };
  }, []);

  const puntos = useMemo(
    () =>
      sismos
        .map((s) => {
          const p = proyeccion([s.lon, s.lat]);
          return p ? { s, x: p[0], y: p[1], r: radioMagnitud(s.mag) } : null;
        })
        .filter((p): p is { s: Sismo; x: number; y: number; r: number } => p !== null)
        .sort((a, b) => b.r - a.r), // los grandes abajo
    [sismos],
  );

  /** Sismo más cercano al puntero, dentro del radio de toque. */
  function cercano(clientX: number, clientY: number) {
    const svg = svgRef.current!;
    const caja = svg.getBoundingClientRect();
    const escala = caja.width / W;
    const mx = (clientX - caja.left) / escala;
    const my = (clientY - caja.top) / escala;
    const [ux, uy] = t.invert([mx, my]);
    let mejor: (typeof puntos)[number] | null = null;
    let mejorD = Infinity;
    for (const p of puntos) {
      const d = Math.hypot(p.x - ux, p.y - uy) * t.k * escala; // en px
      const umbral = Math.max(TOQUE_PX, p.r * Math.sqrt(t.k) * escala + 4);
      if (d <= umbral && d < mejorD) {
        mejor = p;
        mejorD = d;
      }
    }
    return mejor ? { p: mejor, sx: (mejor.x * t.k + t.x) * escala, sy: (mejor.y * t.k + t.y) * escala } : null;
  }

  const boton = (f: number | "reset") => {
    const z = zoomRef.current;
    if (!z) return;
    const sel = select(svgRef.current!);
    if (f === "reset") z.transform(sel, zoomIdentity);
    else z.scaleBy(sel, f);
  };

  const k = t.k;
  const conMuertes = (s: Sismo) => (s.victimas.muertos ?? 0) > 0;
  const sel = puntos.find((p) => p.s.id === seleccion);

  return (
    <div className="mapa-caja">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Mapa mundial con ${sismos.length} sismos. Para elegir uno con el teclado, usa la tabla de todos los sismos.`}
        onClick={(e) => {
          const c = cercano(e.clientX, e.clientY);
          if (c) onSeleccionar(c.p.s.id);
        }}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const c = cercano(e.clientX, e.clientY);
          setHover(c ? { s: c.p.s, x: c.sx, y: c.sy } : null);
          (e.currentTarget as SVGSVGElement).style.cursor = c ? "pointer" : "grab";
        }}
        onPointerLeave={() => setHover(null)}
      >
        {rutas && <path d={rutas.esfera} className="esfera" />}
        <g transform={`translate(${t.x},${t.y}) scale(${k})`}>
          {rutas && (
            <>
              <path d={rutas.graticula} className="graticula" style={{ strokeWidth: 0.4 / k }} />
              <path d={rutas.tierra} className="tierra" />
              <path d={rutas.fronteras} className="fronteras" style={{ strokeWidth: 0.5 / k }} />
            </>
          )}
          {mostrarLimites && rutas && (
            <g aria-hidden="true">
              {rutas.placas.map((p) => (
                <path key={p.cat} d={p.d} className={`placa ${p.cat}`} />
              ))}
            </g>
          )}
          <g aria-hidden="true">
            {puntos.map(({ s, x, y, r }) => (
              <g key={s.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={r / Math.sqrt(k)}
                  className={`sismo ${claseProfundidad(s.profundidadKm)}${s.ubicacionAprox ? " aprox" : ""}`}
                />
                {conMuertes(s) && (
                  <circle cx={x} cy={y} r={r / Math.sqrt(k) + 1.6 / k} className={`anillo${s.ubicacionAprox ? " aprox" : ""}`} />
                )}
              </g>
            ))}
            {sel && <circle cx={sel.x} cy={sel.y} r={sel.r / Math.sqrt(k) + 4 / k} className="seleccion" />}
          </g>
        </g>
      </svg>
      <div className="zoom-botones">
        <button type="button" onClick={() => boton(1.6)} aria-label="Acercar mapa">
          +
        </button>
        <button type="button" onClick={() => boton(1 / 1.6)} aria-label="Alejar mapa">
          −
        </button>
        <button type="button" onClick={() => boton("reset")} aria-label="Restablecer vista del mapa">
          ⟲
        </button>
      </div>
      {hover && (
        <div className="tooltip" style={{ left: hover.x, top: hover.y }} role="presentation">
          <strong>M{n1(hover.s.mag)}</strong> · {fechaCorta(hover.s.tiempo)}
          <br />
          {hover.s.lugar}
          {hover.s.pais && !hover.s.lugar.includes(hover.s.pais) ? `, ${hover.s.pais}` : ""}
          <br />
          {n0(hover.s.profundidadKm)} km de profundidad
          {hover.s.victimas.muertos ? ` · ${n0(hover.s.victimas.muertos)} muertes` : ""}
        </div>
      )}
    </div>
  );
}

export function LeyendaMapa({ mostrarLimites }: { mostrarLimites: boolean }) {
  const circulo = (clase: string, extra?: React.ReactNode) => (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="6" className={clase} />
      {extra}
    </svg>
  );
  const linea = (cat: string) => (
    <svg width="34" height="10" viewBox="0 0 34 10" aria-hidden="true">
      <line x1="1" y1="5" x2="33" y2="5" className={`placa ${cat}`} />
    </svg>
  );
  return (
    <>
      <ul className="leyenda" aria-label="Leyenda de sismos">
        <li>{circulo("sismo p1")}Superficial (&lt; 70 km)</li>
        <li>{circulo("sismo p2")}Intermedio (70–300 km)</li>
        <li>{circulo("sismo p3")}Profundo (&gt; 300 km)</li>
        <li>{circulo("sismo p1", <circle cx="9" cy="9" r="7.5" className="anillo" />)}Con muertes</li>
        <li>{circulo("sismo p1 aprox")}Ubicación aproximada</li>
        <li>
          <svg width="40" height="20" viewBox="0 0 40 20" aria-hidden="true">
            <circle cx="7" cy="12" r="3" className="sismo p2" />
            <circle cx="27" cy="10" r="9" className="sismo p2" />
          </svg>
          Tamaño según magnitud
        </li>
      </ul>
      {mostrarLimites && (
        <ul className="leyenda" aria-label="Leyenda de límites de placas">
          <li>{linea("subduccion")}Subducción</li>
          <li>{linea("colision")}Colisión</li>
          <li>{linea("dorsal")}Dorsal</li>
          <li>{linea("transformante")}Transformante</li>
        </ul>
      )}
    </>
  );
}
