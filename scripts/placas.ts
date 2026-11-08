/**
 * Descarga PB2002_steps.json (Bird, 2003; repo fraxen/tectonicplates) y genera:
 *  - data/placas-pb2002.json: tramos [latA, lonA, latB, lonB, STEPCLASS, PLATEBOUND, VELOCITYLE]
 *  - public/placas-mapa.json: GeoJSON simplificado por tipo de límite, para dibujar el mapa.
 * Uso: npm run placas
 */
import { writeFileSync } from "node:fs";
import { USER_AGENT } from "../lib/config";
import { categoriaLimite } from "../lib/placas";

const URL_PB2002 = "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_steps.json";

type Step = {
  properties: {
    STARTLAT: number; STARTLONG: number; FINALLAT: number; FINALLONG: number;
    STEPCLASS: string; PLATEBOUND: string; VELOCITYLE: number;
  };
};

const r3 = (n: number) => Math.round(n * 1000) / 1000;

async function main() {
  const res = await fetch(URL_PB2002, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`PB2002 HTTP ${res.status}`);
  const { features } = (await res.json()) as { features: Step[] };

  const tramos = features.map(({ properties: p }) => [
    r3(p.STARTLAT), r3(p.STARTLONG), r3(p.FINALLAT), r3(p.FINALLONG), p.STEPCLASS, p.PLATEBOUND, p.VELOCITYLE,
  ]);
  writeFileSync("data/placas-pb2002.json", JSON.stringify(tramos));

  // Une tramos contiguos de la misma categoría en polilíneas.
  const lineas: Record<string, number[][][]> = { subduccion: [], colision: [], dorsal: [], transformante: [] };
  let actual: number[][] | null = null;
  let catActual = "";
  for (const { properties: p } of features) {
    const cat = categoriaLimite(p.STEPCLASS);
    const a = [r3(p.STARTLONG), r3(p.STARTLAT)];
    const b = [r3(p.FINALLONG), r3(p.FINALLAT)];
    const ultimo = actual?.[actual.length - 1];
    if (actual && cat === catActual && ultimo && ultimo[0] === a[0] && ultimo[1] === a[1]) {
      actual.push(b);
    } else {
      actual = [a, b];
      catActual = cat;
      lineas[cat].push(actual);
    }
  }
  const geo = {
    type: "FeatureCollection",
    features: Object.entries(lineas).map(([cat, coords]) => ({
      type: "Feature",
      properties: { cat },
      geometry: { type: "MultiLineString", coordinates: coords },
    })),
  };
  writeFileSync("public/placas-mapa.json", JSON.stringify(geo));
  console.log(`${tramos.length} tramos; polilíneas:`, Object.fromEntries(Object.entries(lineas).map(([k, v]) => [k, v.length])));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
