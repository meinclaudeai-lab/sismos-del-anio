/**
 * Pide al servicio de conteo de USGS los sismos M7+ de cada año desde 1976 hasta el año anterior
 * y guarda data/linea-base-m7.json. Uso: npm run linea-base
 */
import { writeFileSync } from "node:fs";
import { anioActual } from "../lib/config";
import { conteoUSGS } from "../lib/fuentes/usgs";

const DESDE = 1976;

async function main() {
  const hasta = anioActual() - 1;
  const conteos: { anio: number; m7: number }[] = [];
  for (let anio = DESDE; anio <= hasta; anio++) {
    const m7 = await conteoUSGS(`${anio}-01-01`, `${anio + 1}-01-01`, 7);
    conteos.push({ anio, m7 });
    process.stdout.write(`${anio}: ${m7}  `);
  }
  const out = {
    generado: new Date().toISOString(),
    desde: DESDE,
    hasta,
    fuente: "https://earthquake.usgs.gov/fdsnws/event/1/count?starttime={AÑO}-01-01&endtime={AÑO+1}-01-01&minmagnitude=7",
    conteos,
  };
  writeFileSync("data/linea-base-m7.json", JSON.stringify(out, null, 1) + "\n");
  console.log(`\nGuardado data/linea-base-m7.json (${conteos.length} años)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
