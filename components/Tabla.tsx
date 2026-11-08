"use client";

import { useState } from "react";
import type { Sismo } from "@/lib/tipos";
import { fechaUTC, n0, n1 } from "./formato";

type Col = "tiempo" | "mag" | "lugar" | "pais" | "profundidadKm" | "muertos" | "entorno";
const COLUMNAS: { id: Col; titulo: string; secundaria?: boolean; der?: boolean }[] = [
  { id: "tiempo", titulo: "Fecha (UTC)" },
  { id: "mag", titulo: "Mag.", der: true },
  { id: "lugar", titulo: "Lugar" },
  { id: "pais", titulo: "País", secundaria: true },
  { id: "profundidadKm", titulo: "Prof. (km)", secundaria: true, der: true },
  { id: "muertos", titulo: "Muertos", der: true },
  { id: "entorno", titulo: "Entorno", secundaria: true },
];

const valorCol = (s: Sismo, c: Col): number | string =>
  c === "muertos" ? (s.victimas.muertos ?? -1) : (s[c] as number | string);

export default function Tabla({
  sismos,
  seleccion,
  onSeleccionar,
}: {
  sismos: Sismo[];
  seleccion: string | null;
  onSeleccionar: (id: string) => void;
}) {
  const [orden, setOrden] = useState<{ col: Col; asc: boolean }>({ col: "tiempo", asc: false });
  const filas = [...sismos].sort((a, b) => {
    const va = valorCol(a, orden.col);
    const vb = valorCol(b, orden.col);
    const r = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "es");
    return orden.asc ? r : -r;
  });

  return (
    <div className="tabla-caja">
      <table>
        <caption className="sr-only">
          Todos los sismos que cumplen los filtros del mapa ({sismos.length}). Pulsa una fila para ver su detalle.
        </caption>
        <thead>
          <tr>
            {COLUMNAS.map((c) => (
              <th
                key={c.id}
                scope="col"
                className={`${c.secundaria ? "secundaria" : ""} ${c.der ? "der" : ""}`}
                aria-sort={orden.col === c.id ? (orden.asc ? "ascending" : "descending") : "none"}
              >
                <button
                  type="button"
                  onClick={() => setOrden((o) => ({ col: c.id, asc: o.col === c.id ? !o.asc : c.id === "lugar" || c.id === "pais" || c.id === "entorno" }))}
                >
                  {c.titulo}
                  <span aria-hidden="true">{orden.col === c.id ? (orden.asc ? " ▲" : " ▼") : ""}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((s) => (
            <tr
              key={s.id}
              tabIndex={0}
              aria-selected={s.id === seleccion}
              onClick={() => onSeleccionar(s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSeleccionar(s.id);
                }
              }}
            >
              <td className="num" style={{ whiteSpace: "nowrap" }}>{fechaUTC(s.tiempo, false)}</td>
              <td className="num der">{n1(s.mag)}</td>
              <td>
                {s.lugar}
                {s.ubicacionAprox ? " (aprox.)" : ""}
              </td>
              <td className="secundaria">{s.pais}</td>
              <td className="num der secundaria">{n0(s.profundidadKm)}</td>
              <td className="num der">{s.victimas.muertos == null ? <span className="apagado chico">Sin reportes</span> : n0(s.victimas.muertos)}</td>
              <td className="secundaria">{s.entorno}</td>
            </tr>
          ))}
          {filas.length === 0 && (
            <tr>
              <td colSpan={7}>Ningún sismo cumple los filtros.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
