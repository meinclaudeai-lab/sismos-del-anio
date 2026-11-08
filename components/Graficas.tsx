"use client";

import { scaleBand, scaleLinear, scaleSqrt } from "d3-scale";
import { useState } from "react";
import type { Cifras } from "@/lib/resumen";
import type { Datos } from "@/lib/tipos";
import { fechaCorta, MESES, MESES_CORTOS, n0, n1 } from "./formato";

type Tip = { x: number; y: number; texto: string } | null;

function useTip() {
  const [tip, setTip] = useState<Tip>(null);
  const props = (texto: string, x: number, y: number, ancho: number) => ({
    onPointerEnter: () => setTip({ x: (x / ancho) * 100, y, texto }),
    onPointerLeave: () => setTip(null),
    onFocus: () => setTip({ x: (x / ancho) * 100, y, texto }),
    onBlur: () => setTip(null),
  });
  const caja = (alto: number) =>
    tip && (
      <div className="tooltip" style={{ left: `${tip.x}%`, top: `calc(${(tip.y / alto) * 100}% + 14px)` }} role="presentation">
        {tip.texto}
      </div>
    );
  return { props, caja };
}

const W = 600;
const M = { t: 16, r: 12, b: 28, l: 34 };

function SerieAnual({ d, c }: { d: Datos; c: Cifras }) {
  const H = 240;
  const tip = useTip();
  const datos = [...d.lineaBase.conteos.map((x) => ({ anio: x.anio, m7: x.m7, actual: false })), { anio: d.anio, m7: c.m7, actual: true }];
  const proy = c.ritmo.fraccion < 1 && c.ritmo.ritmoAnual != null ? c.ritmo.ritmoAnual : null;
  const max = Math.max(...datos.map((x) => x.m7), proy ?? 0);
  const x = scaleBand<number>().domain(datos.map((x) => x.anio)).range([M.l, W - M.r]).padding(0.2);
  const y = scaleLinear().domain([0, Math.ceil(max / 5) * 5]).range([H - M.b, M.t]);
  const ticks = y.ticks(5);
  return (
    <figure className="grafica" style={{ margin: 0 }}>
      <h3>Sismos M7+ por año desde {d.lineaBase.desde}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Barras de sismos M7+ por año. Promedio ${n1(c.ritmo.promedio)}. ${d.anio}: ${c.m7}${proy ? `, proyección ${n0(proy)}` : ""}.`}>
        <g className="rejilla">
          {ticks.map((t) => (
            <line key={t} x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <g className="eje">
          {ticks.map((t) => (
            <text key={t} x={M.l - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {t}
            </text>
          ))}
          {datos
            .filter((v) => v.anio % 10 === 0 || v.actual)
            .map((v) => (
              <text key={v.anio} x={x(v.anio)! + x.bandwidth() / 2} y={H - M.b + 16} textAnchor="middle">
                {v.anio}
              </text>
            ))}
        </g>
        {proy != null && (
          <rect className="proyeccion" x={x(d.anio)} y={y(proy)} width={x.bandwidth()} height={y(0) - y(proy)} rx={2} />
        )}
        {datos.map((v) => {
          const h = y(0) - y(v.m7);
          return (
            <rect
              key={v.anio}
              className={v.actual ? "serie-2" : "serie"}
              x={x(v.anio)}
              y={y(v.m7)}
              width={x.bandwidth()}
              height={Math.max(0, h)}
              rx={Math.min(2, x.bandwidth() / 2)}
              {...tip.props(`${v.anio}: ${v.m7} sismos M7+${v.actual ? " (hasta hoy)" : ""}`, x(v.anio)! + x.bandwidth() / 2, y(v.m7), W)}
            />
          );
        })}
        <line className="promedio" x1={M.l} x2={W - M.r} y1={y(c.ritmo.promedio)} y2={y(c.ritmo.promedio)} />
        <text className="rotulo" x={M.l + 4} y={y(c.ritmo.promedio) - 5}>
          Promedio {n1(c.ritmo.promedio)}
        </text>
        {proy != null && (
          <text className="rotulo" x={W - M.r} y={M.t - 6} textAnchor="end">
            Proyección {d.anio}: {n0(proy)} ↓
          </text>
        )}
      </svg>
      {tip.caja(H)}
      <ul className="leyenda" aria-label="Leyenda">
        <li>
          <span className="punto" style={{ background: "var(--series)", borderRadius: 2 }} /> Años completos
        </li>
        <li>
          <span className="punto" style={{ background: "var(--series-2)", borderRadius: 2 }} /> {d.anio} hasta hoy
        </li>
        {proy != null && (
          <li>
            <span className="punto" style={{ border: "1.5px dashed var(--series-2)", borderRadius: 2 }} /> Proyección al ritmo actual
          </li>
        )}
      </ul>
      <p className="ayuda-grafica">
        Fuente:{" "}
        <a href="https://earthquake.usgs.gov/fdsnws/event/1/" target="_blank" rel="noopener noreferrer">
          servicio de conteo de USGS
        </a>
        . Proyección = conteo actual ÷ fracción del año transcurrida.
      </p>
    </figure>
  );
}

function PorEntorno({ c }: { c: Cifras }) {
  const fila = 30;
  const izq = 196;
  const H = c.porEntorno.length * fila + 8;
  const tip = useTip();
  const max = Math.max(1, ...c.porEntorno.map((e) => e.n));
  const x = scaleLinear().domain([0, max]).range([izq, W - 40]);
  return (
    <figure className="grafica" style={{ margin: 0 }}>
      <h3>Sismos por entorno tectónico</h3>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={c.porEntorno.map((e) => `${e.entorno}: ${e.n}`).join(". ")}>
        {c.porEntorno.map((e, i) => {
          const yy = i * fila + 4;
          return (
            <g key={e.entorno}>
              <text className="rotulo" x={izq - 8} y={yy + fila / 2 - 3} dy="0.32em" textAnchor="end" style={{ fontSize: 12 }}>
                {e.entorno}
              </text>
              {e.n > 0 && (
                <rect className="serie" x={izq} y={yy + 3} width={x(e.n) - izq} height={fila - 12} rx={3} {...tip.props(`${e.entorno}: ${e.n}`, x(e.n), yy, W)} />
              )}
              <text className="valor" x={e.n > 0 ? x(e.n) + 6 : izq + 2} y={yy + fila / 2 - 3} dy="0.32em">
                {e.n}
              </text>
            </g>
          );
        })}
      </svg>
      {tip.caja(H)}
      <p className="ayuda-grafica">Sismos de magnitud ≥ umbral. Entorno por heurística sobre PB2002, corregible a mano.</p>
    </figure>
  );
}

function Dispersion({ d }: { d: Datos }) {
  const H = 280;
  const MB = 44;
  const tip = useTip();
  const ss = d.sismos.filter((s) => !s.menor);
  const maxProf = Math.max(100, ...ss.map((s) => s.profundidadKm));
  const x = scaleLinear().domain([Math.min(...ss.map((s) => s.mag), d.minMag) - 0.15, Math.max(...ss.map((s) => s.mag), 7.5) + 0.15]).range([M.l + 6, W - M.r - 10]);
  const y = scaleLinear().domain([0, Math.ceil(maxProf / 100) * 100]).range([M.t + 8, H - MB]);
  const maxM = Math.max(1, ...ss.map((s) => s.victimas.muertos ?? 0));
  const r = scaleSqrt().domain([0, maxM]).range([4, 22]);
  return (
    <figure className="grafica" style={{ margin: 0 }}>
      <h3>Profundidad frente a magnitud</h3>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Dispersión de profundidad contra magnitud; el tamaño del punto indica las muertes.">
        <g className="rejilla">
          {y.ticks(5).map((t) => (
            <line key={t} x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <g className="eje">
          {y.ticks(5).map((t) => (
            <text key={t} x={M.l - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {t}
            </text>
          ))}
          {x.ticks(6).map((t) => (
            <text key={t} x={x(t)} y={H - MB + 16} textAnchor="middle">
              {n1(t)}
            </text>
          ))}
          <text x={(M.l + W) / 2} y={H - 4} textAnchor="middle">
            Magnitud
          </text>
          <text x={4} y={M.t - 4}>
            Profundidad (km)
          </text>
        </g>
        {[...ss]
          .sort((a, b) => (b.victimas.muertos ?? 0) - (a.victimas.muertos ?? 0))
          .map((s) => (
            <circle
              key={s.id}
              className={`punto-dispersion${(s.victimas.muertos ?? 0) > 0 ? " muertes" : ""}`}
              cx={x(s.mag)}
              cy={y(s.profundidadKm)}
              r={r(s.victimas.muertos ?? 0)}
              {...tip.props(
                `M${n1(s.mag)} · ${n0(s.profundidadKm)} km · ${s.pais || s.lugar} (${fechaCorta(s.tiempo)})${s.victimas.muertos ? ` · ${n0(s.victimas.muertos)} muertes` : ""}`,
                x(s.mag),
                y(s.profundidadKm),
                W,
              )}
            />
          ))}
      </svg>
      {tip.caja(H)}
      <p className="ayuda-grafica">Cada punto es un sismo; el tamaño crece con las muertes confirmadas (borde rojo si hubo muertes). Los superficiales suelen ser los más dañinos.</p>
    </figure>
  );
}

function PorMes({ d, c }: { d: Datos; c: Cifras }) {
  const H = 220;
  const tip = useTip();
  const x = scaleBand<number>().domain(c.porMes.map((_, i) => i)).range([M.l, W - M.r]).padding(0.25);
  const y = scaleLinear().domain([0, Math.max(4, ...c.porMes)]).nice().range([H - M.b, M.t]);
  return (
    <figure className="grafica" style={{ margin: 0 }}>
      <h3>Sismos por mes en {d.anio}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={c.porMes.map((n, i) => `${MESES[i]}: ${n}`).join(", ")}>
        <g className="rejilla">
          {y.ticks(4).map((t) => (
            <line key={t} x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <g className="eje">
          {y.ticks(4).map((t) => (
            <text key={t} x={M.l - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {t}
            </text>
          ))}
          {c.porMes.map((_, i) => (
            <text key={i} x={x(i)! + x.bandwidth() / 2} y={H - M.b + 16} textAnchor="middle">
              {MESES_CORTOS[i]}
            </text>
          ))}
        </g>
        {c.porMes.map((n, i) =>
          n > 0 ? (
            <rect key={i} className="serie" x={x(i)} y={y(n)} width={x.bandwidth()} height={y(0) - y(n)} rx={3} {...tip.props(`${MESES[i]}: ${n} sismos`, x(i)! + x.bandwidth() / 2, y(n), W)} />
          ) : null,
        )}
      </svg>
      {tip.caja(H)}
      <p className="ayuda-grafica">Sismos de magnitud ≥ {n1(d.minMag)}. Los meses con más sismos suelen deberse a una secuencia de réplicas.</p>
    </figure>
  );
}

export default function Graficas({ d, c }: { d: Datos; c: Cifras }) {
  return (
    <div className="graficas">
      <SerieAnual d={d} c={c} />
      <PorEntorno c={c} />
      <Dispersion d={d} />
      <PorMes d={d} c={c} />
    </div>
  );
}
