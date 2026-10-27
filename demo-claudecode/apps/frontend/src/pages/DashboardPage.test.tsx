import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/apiClient";
import { statsService } from "@/services/statsService";
import type { MonthBucket, StatsSummary } from "@/types/stats";
import { DashboardPage } from "./DashboardPage";

vi.mock("@/services/statsService", () => ({ statsService: { summary: vi.fn(), monthly: vi.fn() } }));
const stats = vi.mocked(statsService);

const summary = (over: Partial<StatsSummary> = {}): StatsSummary => ({
  byStatus: {
    DRAFT: { count: 2, totalCents: 20000 },
    SENT: { count: 3, totalCents: 300000 },
    PAID: { count: 1, totalCents: 50000 },
  },
  overdue: { count: 0, totalCents: 0 },
  totalCount: 6,
  ...over,
});
const months: MonthBucket[] = [
  { key: "2026-10", label: "oct", title: "octubre de 2026", totalsCents: { DRAFT: 0, SENT: 100, PAID: 0 } },
];

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.resetAllMocks());

describe("DashboardPage", () => {
  it("muestra el esqueleto de carga mientras llega el resumen", () => {
    stats.summary.mockReturnValue(new Promise(() => undefined));
    stats.monthly.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument();
  });

  it("muestra las tarjetas, el gráfico mensual y el reparto por estado", async () => {
    stats.summary.mockResolvedValue(summary());
    stats.monthly.mockResolvedValue(months);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Por cobrar").nextElementSibling).toHaveTextContent("3000,00");
    expect(screen.getByText("3 enviadas")).toBeInTheDocument();
    expect(screen.getByText("1 pagada")).toBeInTheDocument();
    expect(screen.getByText("Borradores").nextElementSibling).toHaveTextContent("200,00");
    expect(screen.getByText("Facturas", { selector: "p" }).nextElementSibling).toHaveTextContent("6");
    expect(await screen.findByRole("group", { name: "Importe facturado por mes y estado" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Facturas por estado" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nueva factura" })).toHaveAttribute("href", "/invoices/new");
    expect(document.title).toBe("Dashboard · Facturas");
  });

  it("destaca las facturas vencidas en la tarjeta Por cobrar", async () => {
    stats.summary.mockResolvedValue(summary({ overdue: { count: 2, totalCents: 1000 } }));
    stats.monthly.mockResolvedValue(months);
    renderPage();

    expect(await screen.findByText("2 vencidas")).toBeInTheDocument();
    expect(screen.queryByText("3 enviadas")).not.toBeInTheDocument();
  });

  it("muestra un error con reintento si falla el resumen", async () => {
    stats.summary.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR", "Error interno")).mockResolvedValue(summary());
    stats.monthly.mockResolvedValue(months);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("usa un mensaje genérico si el error no es de la API", async () => {
    stats.summary.mockRejectedValue(new Error("raro"));
    stats.monthly.mockResolvedValue(months);
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos leer las estadísticas.");
  });

  it("si solo falla el gráfico mensual, el resto sigue y se puede reintentar", async () => {
    stats.summary.mockResolvedValue(summary());
    stats.monthly.mockRejectedValueOnce(new ApiError(500, "X", "fallo")).mockResolvedValue(months);
    renderPage();

    expect(await screen.findByText(/No pudimos cargar el gráfico mensual/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.getByRole("group", { name: "Importe facturado por mes y estado" })).toBeInTheDocument());
  });

  it("muestra el esqueleto del gráfico mientras cargan los meses", async () => {
    stats.summary.mockResolvedValue(summary());
    stats.monthly.mockReturnValue(new Promise(() => undefined));
    renderPage();
    await screen.findByRole("heading", { name: "Dashboard" });
    expect(screen.queryByRole("img", { name: "Importe facturado por mes y estado" })).not.toBeInTheDocument();
  });
});
