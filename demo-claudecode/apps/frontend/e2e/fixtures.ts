import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type APIRequestContext, type Page } from "@playwright/test";

export const API = "http://localhost:4100/api/v1";
/** Cuenta de pruebas que crea playwright.config.ts en la base e2e.db (desechable). */
export const E2E_USER = { email: "e2e@example.com", password: "e2e-password-123" };

export interface SeedInvoice {
  id: number;
  number: string;
}

export function invoiceBody(over: Record<string, unknown> = {}) {
  return {
    clientName: "Acme SA",
    clientEmail: "compras@acme.com",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10),
    status: "SENT",
    taxRate: 16,
    currency: "USD",
    notes: "Gracias por su compra",
    items: [{ description: "Servicio de consultoría", quantity: 2, unitPriceCents: 5000 }],
    ...over,
  };
}

export async function createInvoice(request: APIRequestContext, over: Record<string, unknown> = {}): Promise<SeedInvoice> {
  const res = await request.post(`${API}/invoices`, { data: invoiceBody(over) });
  expect(res.status()).toBe(201);
  return (await res.json()).data;
}

async function resetData(request: APIRequestContext) {
  for (;;) {
    const list = await (await request.get(`${API}/invoices?pageSize=100`)).json();
    if (list.data.length === 0) return;
    for (const inv of list.data) await request.delete(`${API}/invoices/${inv.id}`);
  }
}

/** Inicia sesión por la API: devuelve el access token y deja la cookie del refresh en el contexto del navegador. */
export async function loginByApi(request: APIRequestContext, credentials = E2E_USER): Promise<string> {
  const res = await request.post(`${API}/auth/login`, { data: credentials });
  expect(res.status()).toBe(200);
  return (await res.json()).data.token;
}

export const test = base.extend<{ api: APIRequestContext; session: string }>({
  // Cada test arranca con la sesión iniciada en el contexto: la cookie del refresh queda en el navegador, así que la
  // app (sin access token en localStorage) recupera la sesión sola con /auth/refresh, como tras reabrir el navegador.
  session: [
    async ({ context }, provide) => {
      await provide(await loginByApi(context.request));
    },
    { auto: true },
  ],
  // Cliente HTTP aparte con el access token en `Authorization` (sin cookies): así no interfiere con el refresh del navegador.
  api: async ({ playwright, session }, provide) => {
    const api = await playwright.request.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${session}` } });
    await resetData(api);
    await provide(api);
    await api.dispose();
  },
});

export { expect };

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Runs axe on the current page and fails with a readable list of violations. */
export async function expectNoA11yViolations(page: Page, context = "") {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => `   ${n.target.join(" ")}`).join("\n")}`,
  );
  expect(summary, `Violaciones de accesibilidad ${context}`).toEqual([]);
}
