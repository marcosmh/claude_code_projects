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

export const test = base.extend<{ api: APIRequestContext; session: void }>({
  // Cada test arranca con la sesión iniciada: la cookie se guarda en el contexto del navegador,
  // y `context.request` la comparte con las páginas y con las llamadas directas a la API.
  session: [
    async ({ context }, provide) => {
      const res = await context.request.post(`${API}/auth/login`, { data: E2E_USER });
      expect(res.status()).toBe(200);
      await provide();
    },
    { auto: true },
  ],
  api: async ({ context, session }, provide) => {
    void session;
    await resetData(context.request);
    await provide(context.request);
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
