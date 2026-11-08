/**
 * Precalcula los trazos SVG del mapa (esfera, retícula, países y límites de placas) ya proyectados,
 * para que el navegador no tenga que hacerlo. Genera public/mapa-rutas.json.
 * Uso: npm run mapa (después de npm run placas si cambió PB2002).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { geoGraticule10, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { FeatureCollection, MultiLineString } from "geojson";
import { ESFERA, proyeccion } from "../lib/proyeccion";

const ruta = geoPath(proyeccion).digits(1);
const topo = JSON.parse(readFileSync("node_modules/world-atlas/countries-110m.json", "utf8")) as Topology;
const tierra = feature(topo, topo.objects.land) as unknown as FeatureCollection;
const fronteras = mesh(topo, topo.objects.countries as never, (a, b) => a !== b);
const placas = JSON.parse(readFileSync("data/placas-mapa.json", "utf8")) as FeatureCollection<MultiLineString, { cat: string }>;

const out = {
  esfera: ruta(ESFERA),
  graticula: ruta(geoGraticule10()),
  tierra: tierra.features.map((f) => ruta(f)).join(""),
  fronteras: ruta(fronteras),
  placas: placas.features.map((f) => ({ cat: f.properties.cat, d: ruta(f) })),
};
writeFileSync("public/mapa-rutas.json", JSON.stringify(out));
console.log("public/mapa-rutas.json:", Math.round(JSON.stringify(out).length / 1024), "KB");
