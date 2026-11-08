import { describe, expect, it } from "vitest";
import { enColaGDELT, parsearGDELT, parsearRSS } from "../../lib/fuentes/noticias";

describe("cola de GDELT", () => {
  it("ejecuta en serie, con ≥ 5 s entre llamadas, y rechaza si hay demasiadas en espera", async () => {
    const tiempos: number[] = [];
    const t = () => enColaGDELT(async () => tiempos.push(Date.now()));
    const a = t();
    const b = t();
    await expect(t()).rejects.toThrow("ocupado");
    await Promise.all([a, b]);
    expect(tiempos[1] - tiempos[0]).toBeGreaterThanOrEqual(5000);
  }, 15000);
});

describe("parsers de noticias", () => {
  it("GDELT: respuesta de límite de frecuencia (texto) lanza error", () => {
    expect(() => parsearGDELT("Please limit requests to one every 5 seconds")).toThrow();
  });
  it("GDELT: solo título, medio, fecha, enlace e imagen https", () => {
    const n = parsearGDELT(JSON.stringify({ articles: [{ url: "https://a.com/x", title: " Sismo ", seendate: "20261009T180000Z", socialimage: "http://inseguro.jpg", domain: "a.com", language: "Spanish" }] }));
    expect(n).toEqual([{ titulo: "Sismo", medio: "a.com", fecha: "2026-10-09", url: "https://a.com/x", idioma: "Spanish", imagen: null, origen: "GDELT" }]);
  });
  it("RSS de Google Noticias: quita el medio del título", () => {
    const xml = `<rss><channel><item><title>Fuerte sismo en Panamá - La Prensa</title><link>https://news.google.com/x</link><pubDate>Fri, 09 Oct 2026 20:00:00 GMT</pubDate><source url="https://prensa.com">La Prensa</source><description>no se copia</description></item></channel></rss>`;
    expect(parsearRSS(xml)).toEqual([{ titulo: "Fuerte sismo en Panamá", medio: "La Prensa", fecha: "2026-10-09", url: "https://news.google.com/x", idioma: "es", imagen: null, origen: "Google Noticias" }]);
  });
});
