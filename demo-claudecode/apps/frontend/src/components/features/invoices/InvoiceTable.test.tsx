import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { Invoice } from "@/types/invoice";
import { InvoiceTable } from "./InvoiceTable";

const invoice = (over: Partial<Invoice>): Invoice => ({
  id: 1,
  number: "FAC-0001",
  clientName: "Acme SA",
  clientEmail: null,
  clientAddress: null,
  issueDate: "2026-10-01T00:00:00.000Z",
  dueDate: "2026-10-20T00:00:00.000Z",
  status: "SENT",
  isOverdue: false,
  taxRate: 16,
  currency: "USD",
  notes: null,
  items: [],
  subtotalCents: 10000,
  taxCents: 1600,
  totalCents: 11600,
  createdAt: "",
  updatedAt: "",
  ...over,
});

describe("InvoiceTable", () => {
  it("muestra una fila por factura con enlace al detalle, fechas, estado y total", () => {
    render(
      <MemoryRouter>
        <InvoiceTable invoices={[invoice({}), invoice({ id: 2, number: "FAC-0002", clientName: "Beta", status: "PAID" })]} />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Número", "Cliente", "Emisión", "Vence", "Estado", "Total"]);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByRole("link", { name: "FAC-0001" })).toHaveAttribute("href", "/invoices/1");
    expect(rows[0]).toHaveTextContent("Acme SA");
    expect(rows[0]).toHaveTextContent("1 oct 2026");
    expect(rows[0]).toHaveTextContent("20 oct 2026");
    expect(rows[0]).toHaveTextContent("Enviada");
    expect(rows[0]).toHaveTextContent("116,00");
    expect(rows[1]).toHaveTextContent("Pagada");
  });

  it("marca las vencidas", () => {
    render(
      <MemoryRouter>
        <InvoiceTable invoices={[invoice({ isOverdue: true })]} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Vencida")).toBeInTheDocument();
  });
});
