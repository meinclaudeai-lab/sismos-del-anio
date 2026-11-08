import Sitio from "@/components/Sitio";
import { anioActual } from "@/lib/config";
import { datosPagina } from "@/lib/obtener";

// ISR: la página se regenera como máximo cada 15 min (cada fuente tiene además su propia caché).
export const revalidate = 900;

export default async function Pagina() {
  const datos = await datosPagina(anioActual());
  return <Sitio inicial={datos} />;
}
