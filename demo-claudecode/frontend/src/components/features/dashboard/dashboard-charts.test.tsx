import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StatsSummary, MonthBucket } from "@/types/stats";
import { DataTable } from "./DataTable";
import { MonthlyColumns } from "./MonthlyColumns";
import { StatusBar } from "./StatusBar";

const month = (key: string, title: string, paid = 0, sent = 0, draft = 0): MonthBucket => ({
  key,
  label: key.slice(5),
  title,
  totalsCents: { PAID: paid, SENT: sent, DRAFT: draft },
});

describe("DataTable", () => {
  it("renderiza columnas y filas dentro de un details plegable", () => {
    render(
      <DataTable
        columns={["Estado", "Facturas"]}
        rows={[
          ["Borrador", 2],
          ["Pagada", 5],
        ]}
      />,
    );
    expect(screen.getByText("Ver como tabla")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((c) => c.textContent)).toEqual(["Estado", "Facturas"]);
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByRole("cell", { name: "5" })).toBeInTheDocument();
  });
});

describe("MonthlyColumns", () => {
  const months = [month("2026-09", "septiembre de 2026", 10000, 5000, 2500), month("2026-10", "octubre de 2026", 0, 0, 100000)];

  it("expone una zona enfocable por mes con su total", () => {
    render(<MonthlyColumns months={months} />);
    expect(screen.getByRole("img", { name: "Importe facturado por mes y estado" })).toBeInTheDocument();
    expect(screen.getByLabelText(/septiembre de 2026: .*175,00/)).toBeInTheDocument();
    expect(screen.getByLabelText(/octubre de 2026: .*1000,00/)).toBeInTheDocument();
  });

  it("muestra el tooltip con el desglose al enfocar y lo oculta al salir", () => {
    render(<MonthlyColumns months={months} />);
    const zone = screen.getByLabelText(/septiembre de 2026/);

    fireEvent.focus(zone);
    const tooltip = screen.getAllByText("Borrador").find((el) => el.closest(".pointer-events-none"))!.closest(".pointer-events-none") as HTMLElement;
    expect(within(tooltip).getByText("Enviada")).toBeInTheDocument();
    expect(within(tooltip).getByText(/175,00/)).toBeInTheDocument();

    fireEvent.blur(zone);
    expect(document.querySelector(".pointer-events-none")).toBeNull();
  });

  it("el tooltip también responde al puntero", () => {
    render(<MonthlyColumns months={months} />);
    const zone = screen.getByLabelText(/octubre de 2026/);
    fireEvent.pointerEnter(zone);
    expect(document.querySelector(".pointer-events-none")).not.toBeNull();
    fireEvent.pointerLeave(zone);
    expect(document.querySelector(".pointer-events-none")).toBeNull();
  });

  it("incluye leyenda y la tabla alternativa con los totales", () => {
    render(<MonthlyColumns months={months} />);
    expect(screen.getByRole("columnheader", { name: "Total" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /septiembre de 2026/ })).toHaveTextContent("175,00");
  });

  it("avisa cuando no hay importes en ningún mes", () => {
    render(<MonthlyColumns months={[month("2026-09", "septiembre de 2026"), month("2026-10", "octubre de 2026")]} />);
    expect(screen.getByText("Sin facturas en los últimos 2 meses.")).toBeInTheDocument();
  });

  it("no avisa de vacío si hay datos", () => {
    render(<MonthlyColumns months={months} />);
    expect(screen.queryByText(/Sin facturas en los últimos/)).not.toBeInTheDocument();
  });

  it("soporta un mes con un único estado y valores muy pequeños", () => {
    render(<MonthlyColumns months={[month("2026-10", "octubre de 2026", 1)]} />);
    expect(screen.getByLabelText(/octubre de 2026/)).toBeInTheDocument();
  });
});

describe("StatusBar", () => {
  const summary = (d: number, s: number, p: number): StatsSummary["byStatus"] => ({
    DRAFT: { count: d, totalCents: d * 1000 },
    SENT: { count: s, totalCents: s * 2000 },
    PAID: { count: p, totalCents: p * 3000 },
  });

  it("sin facturas muestra un mensaje en lugar del gráfico", () => {
    render(<StatusBar summary={summary(0, 0, 0)} />);
    expect(screen.getByText("Aún no hay facturas.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("muestra segmentos solo para estados con facturas, con porcentaje accesible", () => {
    render(<StatusBar summary={summary(1, 0, 3)} />);
    expect(screen.getByLabelText("Borrador: 1 (25%)")).toBeInTheDocument();
    expect(screen.getByLabelText("Pagada: 3 (75%)")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Enviada:/)).not.toBeInTheDocument();
  });

  it("la lista lista los tres estados, incluso los que están en cero", () => {
    render(<StatusBar summary={summary(1, 0, 3)} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[1]).toHaveTextContent("Enviada");
    expect(items[1]).toHaveTextContent("0%");
  });

  it("al enfocar un segmento muestra el tooltip con cantidad e importe", () => {
    render(<StatusBar summary={summary(2, 0, 0)} />);
    const segment = screen.getByLabelText("Borrador: 2 (100%)");

    fireEvent.focus(segment);
    expect(screen.getByText("2 facturas")).toBeInTheDocument();
    fireEvent.blur(segment);
    expect(screen.queryByText("2 facturas")).not.toBeInTheDocument();

    fireEvent.pointerEnter(segment);
    expect(screen.getByText("2 facturas")).toBeInTheDocument();
    fireEvent.pointerLeave(segment);
    expect(screen.queryByText("2 facturas")).not.toBeInTheDocument();
  });

  it("la tabla alternativa trae el importe por estado", () => {
    render(<StatusBar summary={summary(1, 1, 1)} />);
    expect(screen.getByRole("row", { name: /Pagada/ })).toHaveTextContent("30,00");
  });
});
