import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/apiClient";
import { invoicesService } from "@/services/invoicesService";
import { statsService } from "@/services/statsService";
import type { Invoice, PageMeta } from "@/types/invoice";
import type { StatsSummary } from "@/types/stats";
import { InvoicesPage } from "./InvoicesPage";

vi.mock("@/services/invoicesService", () => ({ invoicesService: { list: vi.fn() } }));
vi.mock("@/services/statsService", () => ({ statsService: { summary: vi.fn() } }));
const invoices = vi.mocked(invoicesService);
const stats = vi.mocked(statsService);

const invoice = (id: number, over: Partial<Invoice> = {}): Invoice =>
  ({
    id,
    number: `FAC-000${id}`,
    clientName: `Cliente ${id}`,
    issueDate: "2026-10-01",
    dueDate: "2026-10-20",
    status: "SENT",
    isOverdue: false,
    totalCents: 11600,
    ...over,
  }) as Invoice;
const meta = (over: Partial<PageMeta> = {}): PageMeta => ({ page: 1, pageSize: 10, total: 1, totalPages: 1, ...over });
const page = (items: Invoice[], m: Partial<PageMeta> = {}) => ({ items, meta: meta({ total: items.length, ...m }) });
const summary: StatsSummary = {
  byStatus: { DRAFT: { count: 1, totalCents: 0 }, SENT: { count: 4, totalCents: 0 }, PAID: { count: 2, totalCents: 0 } },
  overdue: { count: 0, totalCents: 0 },
  totalCount: 7,
};

function Location() {
  return <output aria-label="ubicación">{useLocation().pathname + useLocation().search}</output>;
}

function renderPage(url = "/invoices") {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <InvoicesPage />
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  vi.resetAllMocks();
  stats.summary.mockResolvedValue(summary);
});

describe("InvoicesPage", () => {
  it("muestra el esqueleto mientras carga", () => {
    invoices.list.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument();
  });

  it("lista las facturas con filtros con contadores globales", async () => {
    invoices.list.mockResolvedValue(page([invoice(1), invoice(2)]));
    renderPage();

    expect(await screen.findByRole("link", { name: "FAC-0001" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "FAC-0002" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Todas 7" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviada 4" })).toBeInTheDocument();
    expect(document.title).toBe("Facturas · Facturas");
  });

  it("pide al servicio los filtros de la URL", async () => {
    invoices.list.mockResolvedValue(page([invoice(1)]));
    renderPage("/invoices?status=PAID&q=acme&page=2");

    await screen.findByRole("link", { name: "FAC-0001" });
    expect(invoices.list).toHaveBeenCalledWith({ status: ["PAID"], search: "acme", page: 2, pageSize: 10 }, expect.anything());
  });

  it("con una búsqueda activa oculta los contadores globales", async () => {
    invoices.list.mockResolvedValue(page([invoice(1)]));
    renderPage("/invoices?q=acme");

    await screen.findByRole("link", { name: "FAC-0001" });
    expect(screen.getByRole("button", { name: "Todas" })).toBeInTheDocument();
  });

  it("estado vacío sin filtros invita a crear la primera factura", async () => {
    invoices.list.mockResolvedValue(page([]));
    renderPage();

    expect(await screen.findByText("Aún no hay facturas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crear factura" })).toHaveAttribute("href", "/invoices/new");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("sin coincidencias mantiene los filtros y permite quitarlos", async () => {
    invoices.list.mockImplementation((params) => Promise.resolve(page(params.search ? [] : [invoice(1)])));
    const user = renderPage("/invoices?q=zzz");

    expect(await screen.findByText("Ninguna factura coincide")).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("zzz");
    await user.click(screen.getByRole("link", { name: "Quitar filtros" }));

    expect(screen.getByLabelText("ubicación")).toHaveTextContent(/^\/invoices$/);
    expect(await screen.findByRole("link", { name: "FAC-0001" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("cambiar de pestaña actualiza la URL", async () => {
    invoices.list.mockResolvedValue(page([invoice(1)]));
    const user = renderPage("/invoices?page=3");
    await screen.findByRole("link", { name: "FAC-0001" });

    await user.click(screen.getByRole("button", { name: /^Pagada/ }));

    expect(screen.getByLabelText("ubicación")).toHaveTextContent("/invoices?status=PAID");
  });

  it("buscar actualiza q en la URL", async () => {
    invoices.list.mockResolvedValue(page([invoice(1)]));
    const user = renderPage();
    await screen.findByRole("link", { name: "FAC-0001" });

    await user.type(screen.getByRole("searchbox"), "acme{Enter}");

    expect(screen.getByLabelText("ubicación")).toHaveTextContent("/invoices?q=acme");
  });

  it("la paginación conserva los filtros y cambia de página", async () => {
    invoices.list.mockResolvedValue(page([invoice(1)], { page: 1, total: 25, totalPages: 3 }));
    const user = renderPage("/invoices?status=SENT&q=acme");
    await screen.findByRole("link", { name: "FAC-0001" });

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const loc = new URL(`http://x${screen.getByLabelText("ubicación").textContent}`);
    expect(loc.searchParams.get("page")).toBe("2");
    expect(loc.searchParams.get("status")).toBe("SENT");
    expect(loc.searchParams.get("q")).toBe("acme");
  });

  it("muestra el error de la API y reintenta", async () => {
    invoices.list.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR", "Error interno")).mockResolvedValue(page([invoice(1)]));
    const user = renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("link", { name: "FAC-0001" })).toBeInTheDocument();
  });

  it("si fallan las estadísticas la lista funciona sin contadores", async () => {
    stats.summary.mockRejectedValue(new ApiError(500, "X", "fallo"));
    invoices.list.mockResolvedValue(page([invoice(1)]));
    renderPage();

    expect(await screen.findByRole("link", { name: "FAC-0001" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todas" })).toBeInTheDocument();
  });

  it("marca la lista como ocupada mientras llega la página siguiente (datos anteriores visibles)", async () => {
    invoices.list.mockResolvedValueOnce(page([invoice(1)], { total: 25, totalPages: 3 }));
    let resolveNext: (v: ReturnType<typeof page>) => void = () => undefined;
    invoices.list.mockReturnValueOnce(new Promise((r) => (resolveNext = r)));
    const user = renderPage();
    await screen.findByRole("link", { name: "FAC-0001" });

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("link", { name: "FAC-0001" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "FAC-0001" }).closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
    resolveNext(page([invoice(2)], { page: 2, total: 25, totalPages: 3 }));
    expect(await screen.findByRole("link", { name: "FAC-0002" })).toBeInTheDocument();
  });
});
