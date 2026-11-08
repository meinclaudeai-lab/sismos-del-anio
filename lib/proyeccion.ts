import { geoNaturalEarth1, geoPath } from "d3-geo";

/** Proyección compartida por el mapa y por scripts/mapa.ts: Natural Earth centrada en el Pacífico. */
export const W = 960;
export const ESFERA = { type: "Sphere" } as const;
// Margen de 3 unidades para que el borde de la esfera no quede cortado.
export const proyeccion = geoNaturalEarth1().rotate([-155, 0]).fitWidth(W - 6, ESFERA);
proyeccion.translate([proyeccion.translate()[0] + 3, proyeccion.translate()[1] + 3]);
export const H = Math.ceil(geoPath(proyeccion).bounds(ESFERA)[1][1] + 3);
