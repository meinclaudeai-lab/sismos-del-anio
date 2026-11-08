/**
 * Genera data/respaldo.json con los datos combinados actuales. Se usa solo si USGS falla
 * y todavía no existe ninguna versión buena de la página (p. ej. en el primer build).
 * Uso: npm run respaldo
 */
import { writeFileSync } from "node:fs";
import { anioActual } from "../lib/config";
import { obtenerDatos } from "../lib/datos";

obtenerDatos(anioActual())
  .then((d) => {
    writeFileSync("data/respaldo.json", JSON.stringify({ ...d, esRespaldo: true }) + "\n");
    console.log(`Guardado data/respaldo.json: ${d.sismos.length} sismos, fuentes:`, d.fuentes.map((f) => `${f.id}=${f.ok ? "ok" : "falla"}`).join(" "));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
