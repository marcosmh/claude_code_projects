import { API, createInvoice, expect, test } from "./fixtures";

test.describe("flujos de usuario", () => {
  test("crear una factura desde el formulario y verla en el detalle", async ({ page, api }) => {
    void api; // reinicia los datos
    await page.goto("/invoices");
    await expect(page.getByText("Aún no hay facturas")).toBeVisible();

    await page.getByRole("link", { name: "Crear factura" }).click();
    await page.getByLabel("Cliente *").fill("Cliente E2E");
    await page.getByLabel("Email").fill("e2e@example.com");
    await page.getByLabel("Descripción de la línea 1").fill("Horas de desarrollo");
    await page.getByLabel("Cantidad de la línea 1").fill("2");
    await page.getByLabel("Precio de la línea 1").fill("50");
    await page.getByLabel("Impuesto (%)").fill("10");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page).toHaveURL(/\/invoices\/\d+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^FAC-\d{4}$/);
    await expect(page.getByText("Cliente E2E")).toBeVisible();
    // 2 x 50,00 + 10 % = 110,00
    await expect(page.getByText(/110,00/).first()).toBeVisible();
    await expect(page.getByRole("status")).toContainText(/creada/);
  });

  test("el formulario no envía datos inválidos y marca los campos", async ({ page }) => {
    await page.goto("/invoices/new");
    await page.getByRole("button", { name: "Guardar" }).click();

    const client = page.getByLabel("Cliente *");
    await expect(client).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("El cliente es obligatorio")).toBeVisible();
    await expect(page).toHaveURL(/\/invoices\/new$/);
  });

  test("editar una factura conserva su número", async ({ page, api }) => {
    const { id, number } = await createInvoice(api, { clientName: "Antes SA" });
    await page.goto(`/invoices/${id}/edit`);
    await page.getByLabel("Cliente *").fill("Después SA");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page).toHaveURL(new RegExp(`/invoices/${id}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(number);
    await expect(page.getByText("Después SA")).toBeVisible();
  });

  test("avanzar el estado: borrador → enviada → pagada", async ({ page, api }) => {
    const { id } = await createInvoice(api, { status: "DRAFT" });
    await page.goto(`/invoices/${id}`);

    await page.getByRole("button", { name: "Marcar como enviada" }).click();
    await expect(page.getByRole("button", { name: "Marcar como pagada" })).toBeVisible();
    await page.getByRole("button", { name: "Marcar como pagada" }).click();

    await expect(page.getByText("Pagada").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Marcar como/ })).toHaveCount(0);
  });

  test("eliminar pide confirmación, se puede cancelar y borra de verdad", async ({ page, api }) => {
    const { id, number } = await createInvoice(api);
    await page.goto(`/invoices/${id}`);

    await page.getByRole("button", { name: "Eliminar", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: `Eliminar ${number}` });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect((await api.get(`${API}/invoices/${id}`)).status()).toBe(200);

    await page.getByRole("button", { name: "Eliminar", exact: true }).click();
    await dialog.getByRole("button", { name: "Eliminar factura" }).click();

    await expect(page).toHaveURL(/\/invoices$/);
    expect((await api.get(`${API}/invoices/${id}`)).status()).toBe(404);
  });

  test("buscar y filtrar por estado se refleja en la URL", async ({ page, api }) => {
    await createInvoice(api, { clientName: "Alfa SA", status: "PAID" });
    await createInvoice(api, { clientName: "Beta SA", status: "DRAFT" });
    await page.goto("/invoices");
    await expect(page.getByRole("row")).toHaveCount(3); // cabecera + 2

    await page.getByLabel("Buscar por número o cliente").fill("alfa");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/q=alfa/);
    await expect(page.getByRole("row", { name: /Alfa SA/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Beta SA/ })).toHaveCount(0);

    await page.goto("/invoices");
    await page.getByRole("navigation", { name: "Filtrar por estado" }).getByRole("button", { name: /Borrador/ }).click();
    await expect(page).toHaveURL(/status=DRAFT/);
    await expect(page.getByRole("row", { name: /Beta SA/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Alfa SA/ })).toHaveCount(0);

    await page.getByLabel("Buscar por número o cliente").fill("no existe");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByText("Ninguna factura coincide")).toBeVisible();
  });

  test("el PDF de una factura se genera", async ({ page, api }) => {
    const { id } = await createInvoice(api);
    await page.goto(`/invoices/${id}`);
    const href = await page.getByRole("link", { name: "Ver PDF" }).getAttribute("href");
    const res = await api.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect((await res.body()).subarray(0, 4).toString()).toBe("%PDF");
  });

  test("una factura inexistente muestra la pantalla de no encontrada", async ({ page }) => {
    await page.goto("/invoices/999999");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("main")).toContainText(/no (existe|encontr)/i);
  });

  test("el dashboard refleja las facturas creadas", async ({ page, api }) => {
    await createInvoice(api, { status: "PAID" });
    await createInvoice(api, { status: "DRAFT" });
    await page.goto("/dashboard");
    await expect(page.getByText("Facturas", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("group", { name: "Facturas por estado" })).toBeVisible();
    await expect(page.getByRole("img", { name: /Pagada: 1 \(50%\)/ })).toBeVisible();
  });
});

test.describe("tema, menú y teclado", () => {
  test("el tema se conserva al recargar", async ({ page }) => {
    await page.addInitScript(() => localStorage.getItem("theme") ?? localStorage.setItem("theme", "light"));
    await page.goto("/dashboard");
    const html = page.locator("html");
    await expect(html).not.toHaveClass(/dark/);

    await page.getByRole("switch", { name: "Tema oscuro" }).click();
    await expect(html).toHaveClass(/dark/);
    await page.reload();
    await expect(html).toHaveClass(/dark/);
  });

  test("con el menú plegado el cambio de tema sigue disponible", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Ocultar menú" }).click();
    await expect(page.getByRole("navigation", { name: "Principal" })).toBeHidden();
    await expect(page.getByRole("switch", { name: "Tema oscuro" })).toBeVisible();
    await page.getByRole("button", { name: "Mostrar menú" }).click();
    await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
  });

  test("al navegar el foco pasa al contenido y el enlace de salto funciona", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Facturas" }).click();
    await expect(page).toHaveURL(/\/invoices$/);
    await expect(page.getByRole("main")).toBeFocused();

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Facturas" })).toBeVisible();
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Saltar al contenido" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#contenido$/);
  });

  test("los puntos del gráfico se pueden recorrer con el teclado", async ({ page, api }) => {
    await createInvoice(api, { status: "PAID" });
    await page.goto("/dashboard");
    const bars = page.getByRole("img", { name: /Pagada: 1/ });
    await bars.focus();
    await expect(bars).toBeFocused();
    await expect(page.getByText("1 facturas")).toBeVisible();
  });
});
