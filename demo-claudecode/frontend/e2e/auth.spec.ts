import { expect, test } from "@playwright/test";
import { API, E2E_USER, expectNoA11yViolations, test as sessionTest } from "./fixtures";

// Aquí se usa el `test` de Playwright, no el de fixtures.ts: ningún test arranca con la sesión iniciada.
test.describe("autenticación", () => {
  test("sin sesión, la API rechaza las peticiones con 401", async ({ request }) => {
    const res = await request.get(`${API}/invoices`);
    expect(res.status()).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
  });

  test("una ruta protegida redirige al inicio de sesión y, tras entrar, vuelve a ella", async ({ page }) => {
    await page.goto("/invoices");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1, name: "Iniciar sesión" })).toBeVisible();

    await page.getByLabel("Email").fill(E2E_USER.email);
    await page.getByLabel("Contraseña").fill(E2E_USER.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page).toHaveURL(/\/invoices$/);
    await expect(page.getByRole("heading", { level: 1, name: "Facturas" })).toBeVisible();
    await expect(page.getByText(E2E_USER.email)).toBeVisible();
  });

  test("la sesión sobrevive a recargar la página", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_USER.email);
    await page.getByLabel("Contraseña").fill(E2E_USER.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.reload();

    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  });

  test("credenciales incorrectas muestran un aviso y no inician sesión", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_USER.email);
    await page.getByLabel("Contraseña").fill("contraseña-equivocada");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page.getByRole("alert")).toContainText("Email o contraseña incorrectos");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("cerrar sesión revoca el refresh y borra el token: ya no hay acceso a las rutas protegidas", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_USER.email);
    await page.getByLabel("Contraseña").fill(E2E_USER.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);

    expect(await page.evaluate(() => localStorage.getItem("accessToken"))).toBeNull();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    expect((await page.request.post(`${API}/auth/refresh`)).status()).toBe(401);
  });

  test("una sesión revocada en el servidor devuelve al inicio de sesión sin recargar", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_USER.email);
    await page.getByLabel("Contraseña").fill(E2E_USER.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Se cierra la sesión por otra vía (p. ej. otra pestaña) y el access token de esta caduca: sin refresh válido,
    // la app vuelve al inicio de sesión sin recargar.
    await page.request.post(`${API}/auth/logout`);
    await page.evaluate(() => localStorage.removeItem("accessToken"));
    await page.getByRole("link", { name: "Facturas" }).click();

    await expect(page).toHaveURL(/\/login$/);
  });

  test("la pantalla de inicio de sesión no tiene violaciones de accesibilidad (claro, oscuro y con error)", async ({ page }) => {
    await page.goto("/login");
    await expectNoA11yViolations(page, "login claro");

    await page.getByRole("switch", { name: "Tema oscuro" }).click();
    await expectNoA11yViolations(page, "login oscuro");

    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page.getByText("Escribe tu email")).toBeVisible();
    await expectNoA11yViolations(page, "login con errores");
  });
});

test.describe("cambio de contraseña", () => {
  test("se cambia desde la cuenta, se puede entrar con la nueva y no con la antigua", async ({ page }) => {
    const NEW = "una-contraseña-nueva-123";
    const signIn = async (password: string) => {
      await page.goto("/login");
      await page.getByLabel("Email").fill(E2E_USER.email);
      await page.getByLabel("Contraseña").fill(password);
      await page.getByRole("button", { name: "Iniciar sesión" }).click();
    };
    await signIn(E2E_USER.password);
    await expect(page).toHaveURL(/\/dashboard$/);

    try {
      await page.getByRole("link", { name: "Cambiar contraseña" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Cambiar contraseña" })).toBeVisible();
      await expectNoA11yViolations(page, "cambiar contraseña");

      await page.getByLabel("Contraseña actual").fill("no-es-esta-contraseña");
      await page.getByLabel("Nueva contraseña", { exact: true }).fill(NEW);
      await page.getByLabel("Repite la nueva contraseña").fill(NEW);
      await page.getByRole("button", { name: "Guardar contraseña" }).click();
      await expect(page.getByText("La contraseña actual no es correcta")).toBeVisible();

      await page.getByLabel("Contraseña actual").fill(E2E_USER.password);
      await page.getByRole("button", { name: "Guardar contraseña" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByText("Contraseña actualizada")).toBeVisible();

      await page.getByRole("button", { name: "Cerrar sesión" }).click();
      await signIn(E2E_USER.password);
      await expect(page.getByRole("alert")).toContainText("Email o contraseña incorrectos");
      await signIn(NEW);
      await expect(page).toHaveURL(/\/dashboard$/);
    } finally {
      // Deja la cuenta como estaba para el resto de la suite, falle lo que falle arriba: entra con la nueva
      // contraseña (si llegó a cambiarse) y la devuelve a la original.
      const login = await page.request.post(`${API}/auth/login`, { data: { email: E2E_USER.email, password: NEW } });
      if (login.status() === 200) {
        const token = (await login.json()).data.token;
        const res = await page.request.post(`${API}/auth/password`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { currentPassword: NEW, newPassword: E2E_USER.password },
        });
        expect(res.status()).toBe(204);
      }
    }
  });
});

// Estos casos usan el `test` con sesión (fixtures.ts): el contexto ya tiene la cookie del refresh.
sessionTest.describe("renovación transparente de la sesión", () => {
  sessionTest("sin access token en localStorage, la app recupera la sesión por el refresh", async ({ page }) => {
    await page.goto("/invoices");
    await expect(page.getByRole("heading", { level: 1, name: "Facturas" })).toBeVisible();
    await expect(page).toHaveURL(/\/invoices$/);
    expect(await page.evaluate(() => localStorage.getItem("accessToken"))).toBeTruthy();
  });

  sessionTest("un access token caducado se renueva solo y la petición se repite", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    const before = await page.evaluate(() => localStorage.getItem("accessToken"));

    // Se corrompe el token guardado (equivale a uno caducado): el backend responde 401.
    await page.evaluate(() => localStorage.setItem("accessToken", "token-caducado"));
    const refreshes: string[] = [];
    page.on("request", (r) => r.url().endsWith("/auth/refresh") && refreshes.push(r.url()));
    await page.getByRole("link", { name: "Facturas" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Facturas" })).toBeVisible();
    await expect(page).toHaveURL(/\/invoices$/);
    expect(refreshes).toHaveLength(1);
    const after = await page.evaluate(() => localStorage.getItem("accessToken"));
    expect(after).not.toBe("token-caducado");
    expect(after).toBeTruthy();
    expect(before).toBeTruthy();
  });
});
