import type { Page } from "@playwright/test";
import { createInvoice, expect, expectNoA11yViolations, test } from "./fixtures";

const row = (page: Page, client: string) => page.getByRole("row", { name: new RegExp(client) });

const MONTH = (offset: number) => {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - offset, 1);
  return d.toISOString().slice(0, 10);
};

test.describe("accesibilidad (axe)", () => {
  test.beforeEach(async ({ api }) => {
    await createInvoice(api, { clientName: "Acme SA", status: "SENT" });
    await createInvoice(api, { clientName: "Beta SL", status: "PAID", issueDate: MONTH(1), dueDate: MONTH(0) });
    await createInvoice(api, { clientName: "Gamma", status: "DRAFT", issueDate: MONTH(2), dueDate: MONTH(0) });
    await createInvoice(api, { clientName: "Vencida SA", status: "SENT", issueDate: MONTH(3), dueDate: MONTH(2) });
  });

  for (const scheme of ["light", "dark"] as const) {
    test.describe(`tema ${scheme}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.addInitScript((theme) => {
          try {
            localStorage.setItem("theme", theme);
          } catch {
            /* sin storage */
          }
        }, scheme);
      });

      test("dashboard", async ({ page }) => {
        await page.goto("/dashboard");
        await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
        await expect(page.getByRole("group", { name: /Importe facturado/ })).toBeVisible();
        await expectNoA11yViolations(page, "dashboard");
      });

      test("listado de facturas", async ({ page }) => {
        await page.goto("/invoices");
        await expect(row(page, "Acme SA")).toBeVisible();
        await expectNoA11yViolations(page, "listado");
      });

      test("detalle, edición y alta", async ({ page }) => {
        await page.goto("/invoices");
        await row(page, "Acme SA").getByRole("link").click();
        await expect(page.getByRole("heading", { level: 1, name: /FAC-/ })).toBeVisible();
        await expectNoA11yViolations(page, "detalle");

        await page.getByRole("link", { name: "Editar" }).click();
        await expect(page.getByLabel("Cliente *")).toHaveValue("Acme SA");
        await expectNoA11yViolations(page, "edición");

        await page.goto("/invoices/new");
        await expectNoA11yViolations(page, "alta");
      });
    });
  }

  test("formulario con errores de validación", async ({ page }) => {
    await page.goto("/invoices/new");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("El cliente es obligatorio")).toBeVisible();
    await expectNoA11yViolations(page, "formulario con errores");
  });

  test("diálogo de confirmación abierto", async ({ page }) => {
    await page.goto("/invoices");
    await row(page, "Acme SA").getByRole("link").click();
    await page.getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoA11yViolations(page, "diálogo");
  });

  test("404 y estado vacío", async ({ page, api }) => {
    await page.goto("/ruta-que-no-existe");
    await expectNoA11yViolations(page, "404");

    for (const inv of (await (await api.get("http://localhost:4100/api/v1/invoices")).json()).data) {
      await api.delete(`http://localhost:4100/api/v1/invoices/${inv.id}`);
    }
    await page.goto("/invoices");
    await expect(page.getByText("Aún no hay facturas")).toBeVisible();
    await expectNoA11yViolations(page, "estado vacío");
  });

  test("móvil con menú plegado", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Ocultar menú" }).click();
    await expectNoA11yViolations(page, "móvil, menú plegado");
  });
});
