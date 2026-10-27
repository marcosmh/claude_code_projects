import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { PageHeader } from "./PageHeader";
import { Panel } from "./Panel";
import { PageSkeleton } from "./Skeleton";
import { StatCard } from "./StatCard";
import { StatusBadge } from "./StatusBadge";
import { button } from "./ui";

describe("EmptyState", () => {
  it("muestra título, descripción y contenido adicional", () => {
    render(
      <EmptyState title="Aún no hay facturas" description="Crea la primera">
        <a href="/x">Crear</a>
      </EmptyState>,
    );
    expect(screen.getByText("Aún no hay facturas")).toBeInTheDocument();
    expect(screen.getByText("Crea la primera")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crear" })).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("es un alert con el mensaje y reintenta al pulsar el botón", async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Servidor caído" onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Servidor caído");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("sin onRetry no muestra el botón", () => {
    render(<ErrorState message="Servidor caído" />);
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });
});

describe("PageHeader", () => {
  it("muestra el título, las migas (con y sin enlace) y las acciones", () => {
    render(
      <MemoryRouter>
        <PageHeader title="Editar FAC-0001" trail={[{ label: "Facturas", to: "/invoices" }, { label: "Editar" }]}>
          <button type="button">Acción</button>
        </PageHeader>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Editar FAC-0001" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Ruta" });
    expect(nav).toHaveTextContent("Editar");
    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Facturas" })).toHaveAttribute("href", "/invoices");
    expect(screen.queryByRole("link", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acción" })).toBeInTheDocument();
  });

  it("funciona sin migas", () => {
    render(
      <MemoryRouter>
        <PageHeader title="Facturas" />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});

describe("Panel", () => {
  it("renderiza título, subtítulo opcional y contenido", () => {
    const { rerender } = render(
      <Panel title="Importe" subtitle="Últimos 6 meses">
        contenido
      </Panel>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Importe" })).toBeInTheDocument();
    expect(screen.getByText("Últimos 6 meses")).toBeInTheDocument();
    expect(screen.getByText("contenido")).toBeInTheDocument();

    rerender(<Panel title="Importe">contenido</Panel>);
    expect(screen.queryByText("Últimos 6 meses")).not.toBeInTheDocument();
  });
});

describe("PageSkeleton", () => {
  it("anuncia la carga como status accesible", () => {
    render(<PageSkeleton rows={3} />);
    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument();
  });
});

describe("StatCard", () => {
  it("muestra etiqueta, valor y la insignia solo si se pasa", () => {
    const { rerender } = render(<StatCard label="Cobrado" value="$10" badge="2 pagadas" tone="good" icon={<path d="M0 0" />} />);
    expect(screen.getByText("Cobrado")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
    expect(screen.getByText("2 pagadas")).toBeInTheDocument();

    rerender(<StatCard label="Cobrado" value="$10" icon={<path d="M0 0" />} />);
    expect(screen.queryByText("2 pagadas")).not.toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  it("muestra la etiqueta en español", () => {
    render(<StatusBadge status="PAID" />);
    expect(screen.getByText("Pagada")).toBeInTheDocument();
    expect(screen.queryByText("Vencida")).not.toBeInTheDocument();
  });

  it("marca la factura como vencida", () => {
    render(<StatusBadge status="SENT" overdue />);
    expect(screen.getByText("Enviada")).toBeInTheDocument();
    expect(screen.getByText("Vencida")).toBeInTheDocument();
  });
});

describe("button()", () => {
  it("compone clases según variante y tamaño", () => {
    expect(button()).toContain("bg-primary");
    expect(button("secondary", "sm")).toContain("px-3");
    expect(button("danger")).toContain("text-red-700");
  });
});
