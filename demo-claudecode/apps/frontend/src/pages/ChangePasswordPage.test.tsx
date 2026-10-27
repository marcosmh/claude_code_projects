import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createQueryClient } from "@/queryClient";
import { useToastStore } from "@/store/toastStore";
import { ChangePasswordPage } from "./ChangePasswordPage";

afterEach(() => {
  vi.unstubAllGlobals();
  useToastStore.setState({ toasts: [] });
});

function setup(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchMock);
  const router = createMemoryRouter(
    [
      { path: "/account/password", element: <ChangePasswordPage /> },
      { path: "/dashboard", element: <p>Panel</p> },
    ],
    { initialEntries: ["/account/password"] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

async function fill(user: ReturnType<typeof userEvent.setup>, current = "actual", next = "una contraseña larga", confirm = next) {
  await user.type(screen.getByLabelText("Contraseña actual"), current);
  await user.type(screen.getByLabelText("Nueva contraseña"), next);
  if (confirm) await user.type(screen.getByLabelText("Repite la nueva contraseña"), confirm);
  await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));
}

describe("ChangePasswordPage", () => {
  it("valida en el cliente: nueva corta y confirmación distinta no llaman a la API", async () => {
    const fetchMock = vi.fn();
    const user = setup(fetchMock);

    await fill(user, "actual", "corta", "otra");

    expect(await screen.findByText("Usa al menos 12 caracteres")).toBeInTheDocument();
    expect(screen.getByText("Las contraseñas no coinciden")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("guarda, avisa con un toast y vuelve al panel", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const user = setup(fetchMock);

    await fill(user);

    expect(await screen.findByText("Panel")).toBeInTheDocument();
    expect(useToastStore.getState().toasts[0]?.message).toContain("Contraseña actualizada");
    expect(JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string)).toEqual({
      currentPassword: "actual",
      newPassword: "una contraseña larga",
    });
  });

  it("muestra el error del servidor junto al campo de la contraseña actual", async () => {
    const body = { error: { code: "UNPROCESSABLE_ENTITY", message: "x", details: [{ field: "currentPassword", message: "La contraseña actual no es correcta" }] } };
    const user = setup(vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 422 })));

    await fill(user);

    expect(await screen.findByText("La contraseña actual no es correcta")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña actual")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("Panel")).not.toBeInTheDocument();
  });

  it("un error sin campo (red, 429) se muestra como aviso general", async () => {
    const user = setup(vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await fill(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar");
  });
});
