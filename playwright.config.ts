import { defineConfig, devices } from "@playwright/test";

const PUERTO = Number(process.env.PUERTO ?? 3100);
// Si no se puede descargar el navegador de Playwright, PW_CHROMIUM apunta a un Chromium local.
const executablePath = process.env.PW_CHROMIUM || undefined;
// PW_BASE_URL prueba un despliegue (p. ej. producción) en vez del servidor local.
const BASE_URL = process.env.PW_BASE_URL;

const combinaciones = [
  { name: "movil-claro", width: 390, scheme: "light" as const },
  { name: "movil-oscuro", width: 390, scheme: "dark" as const },
  { name: "escritorio-claro", width: 1280, scheme: "light" as const },
  { name: "escritorio-oscuro", width: 1280, scheme: "dark" as const },
];

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  reporter: "list",
  use: { baseURL: BASE_URL ?? `http://localhost:${PUERTO}`, launchOptions: { executablePath } },
  projects: combinaciones.map((c) => ({
    name: c.name,
    use: {
      ...(c.width < 768 ? devices["Pixel 7"] : devices["Desktop Chrome"]),
      viewport: { width: c.width, height: c.width < 768 ? 844 : 900 },
      colorScheme: c.scheme,
      locale: "es-MX",
      timezoneId: "America/Mexico_City",
    },
  })),
  webServer: BASE_URL
    ? undefined
    : {
        command: `npx next start -p ${PUERTO}`,
        port: PUERTO,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
