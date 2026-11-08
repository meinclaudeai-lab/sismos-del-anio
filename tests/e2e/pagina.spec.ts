import { expect, test } from "@playwright/test";

test.describe("Sismos del año", () => {
  test("carga, mapa con sismos y sin desplazamiento horizontal", async ({ page }, info) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Sismos del año");
    await expect(page.locator(".conclusion")).not.toBeEmpty();
    await expect(page.locator(".mapa-caja circle.sismo").first()).toBeVisible();
    await page.waitForFunction(() => document.querySelector("path.tierra") !== null);
    const ancho = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(ancho[0]).toBeLessThanOrEqual(ancho[1]);
    await page.screenshot({ path: `tests/e2e/capturas/${info.project.name}.png`, fullPage: true });
    await page.locator("#mapa").screenshot({ path: `tests/e2e/capturas/${info.project.name}-mapa.png` });
  });

  test("sin desplazamiento horizontal a 360 px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");
    await page.waitForFunction(() => document.querySelector("path.tierra") !== null);
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(sw).toBeLessThanOrEqual(iw);
  });

  test("filtros del mapa y la tabla", async ({ page }) => {
    await page.goto("/");
    const filas = page.locator("tbody tr");
    const total = await filas.count();
    await page.getByRole("button", { name: "Con muertes" }).click();
    const conMuertes = await filas.count();
    expect(conMuertes).toBeGreaterThan(0);
    expect(conMuertes).toBeLessThan(total);
    for (const t of await page.locator("tbody tr td:nth-child(6)").allInnerTexts()) expect(Number(t.replace(/\D/g, ""))).toBeGreaterThan(0);
    await page.getByRole("button", { name: "M7+" }).click();
    for (const t of await page.locator("tbody tr td:nth-child(2)").allInnerTexts()) expect(Number(t.replace(",", "."))).toBeGreaterThanOrEqual(7);
    expect(await page.locator(".mapa-caja circle.sismo").count()).toBe(await filas.count());
  });

  test("seleccionar un sismo abre el detalle y cambia la URL", async ({ page }) => {
    await page.goto("/");
    const fila = page.locator("tbody tr").nth(3);
    const lugar = (await fila.locator("td").nth(2).innerText()).replace(" (aprox.)", "");
    await fila.click();
    await expect(page.locator("#detalle h2")).toContainText(lugar.split(",")[0]);
    await expect(page).toHaveURL(/\?sismo=/);
    await expect(fila).toHaveAttribute("aria-selected", "true");
  });

  test("enlace para compartir abre ese sismo", async ({ page }) => {
    await page.goto("/?sismo=us6000t7zp");
    await expect(page.locator("#detalle h2")).toContainText("La Guaira");
    await expect(page.locator("#detalle")).toContainText("Muertos");
  });

  test("?año= carga un año anterior", async ({ page }) => {
    await page.goto("/?año=2025");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("2025", { timeout: 30_000 });
    await expect(page.locator("tbody tr").first()).toContainText("2025");
  });

  test("teclado: una fila se elige con Enter", async ({ page }) => {
    await page.goto("/");
    const fila = page.locator("tbody tr").nth(1);
    await fila.focus();
    await page.keyboard.press("Enter");
    await expect(fila).toHaveAttribute("aria-selected", "true");
  });
});
