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

  test("cerrar sesión revoca el refresh y borra las cookies: ya no hay acceso a las rutas protegidas", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_USER.email);
    await page.getByLabel("Contraseña").fill(E2E_USER.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);

    expect(await page.evaluate(() => localStorage.getItem("accessToken"))).toBeNull();
    const names = (await page.context().cookies()).map((c) => c.name);
    expect(names).not.toContain("at");
    expect(names).not.toContain("refresh");

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    expect((await page.request.post(`${API}/auth/refresh`)).status()).toBe(401);
  });

  test("si el logout falla, el servidor no lo revoca y al recargar la sesión no se restaura sola", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_USER.email);
    await page.getByLabel("Contraseña").fill(E2E_USER.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.route("**/auth/logout", (route) => route.abort());
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);

    // La cookie del refresh sigue viva en el servidor, pero este navegador no la usa para restaurar la sesión.
    await page.unroute("**/auth/logout");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);

    // Un inicio de sesión correcto limpia la marca.
    await page.getByLabel("Email").fill(E2E_USER.email);
    await page.getByLabel("Contraseña").fill(E2E_USER.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(await page.evaluate(() => localStorage.getItem("loggedOut"))).toBeNull();
  });

  test("una sesión revocada en el servidor devuelve al inicio de sesión sin recargar", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_USER.email);
    await page.getByLabel("Contraseña").fill(E2E_USER.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Se cierra la sesión por otra vía (p. ej. otra pestaña) y la cookie del access token de esta caduca: sin refresh
    // válido, la app vuelve al inicio de sesión sin recargar. El logout ya borra las cookies del contexto; se pone una
    // cookie `at` inválida (un JWT sin caducar seguiría valiendo aunque se cierre la sesión).
    await page.request.post(`${API}/auth/logout`);
    await page.context().addCookies([{ name: "at", value: "token-caducado", domain: "localhost", path: "/api/v1", httpOnly: true }]);
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
      // Se espera a que el logout termine: navegar antes lo aborta en el navegador, el servidor revoca el refresh pero las
      // cookies no llegan a borrarse y el access token (válido hasta 15 min) restauraría la sesión.
      await expect(page).toHaveURL(/\/login$/);
      await signIn(E2E_USER.password);
      await expect(page.getByRole("alert")).toContainText("Email o contraseña incorrectos");
      await signIn(NEW);
      await expect(page).toHaveURL(/\/dashboard$/);
    } finally {
      // Deja la cuenta como estaba para el resto de la suite, falle lo que falle arriba: entra con la nueva
      // contraseña (si llegó a cambiarse) y la devuelve a la original.
      const login = await page.request.post(`${API}/auth/login`, { data: { email: E2E_USER.email, password: NEW, mode: "token" } });
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
  sessionTest("sin la cookie del access token, la app recupera la sesión por el refresh", async ({ page }) => {
    await page.context().clearCookies({ name: "at" });
    await page.goto("/invoices");
    await expect(page.getByRole("heading", { level: 1, name: "Facturas" })).toBeVisible();
    await expect(page).toHaveURL(/\/invoices$/);
    expect((await page.context().cookies()).map((c) => c.name)).toContain("at");
    // El token nunca llega al JavaScript de la página.
    expect(await page.evaluate(() => localStorage.getItem("accessToken"))).toBeNull();
  });

  sessionTest("un access token caducado se renueva solo y la petición se repite", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    const cookie = async () => (await page.context().cookies()).find((c) => c.name === "at")?.value;
    const before = await cookie();

    // Se corrompe la cookie del access token (equivale a una caducada): el backend responde 401.
    await page.context().addCookies([{ name: "at", value: "token-caducado", domain: "localhost", path: "/api/v1", httpOnly: true }]);
    const refreshes: string[] = [];
    page.on("request", (r) => r.url().endsWith("/auth/refresh") && refreshes.push(r.url()));
    // El encabezado aparece antes de que lleguen el 401 y el refresh: se espera a la petición repetida con éxito.
    const retried = page.waitForResponse((r) => r.url().includes("/invoices?") && r.status() === 200);
    await page.getByRole("link", { name: "Facturas" }).click();
    await retried;

    await expect(page.getByRole("heading", { level: 1, name: "Facturas" })).toBeVisible();
    await expect(page).toHaveURL(/\/invoices$/);
    expect(refreshes).toHaveLength(1);
    const after = await cookie();
    expect(after).not.toBe("token-caducado");
    expect(after).toBeTruthy();
    expect(before).toBeTruthy();
  });
});
