// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ setUser: vi.fn() }));
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ user: undefined, isLoading: false, setUser: session.setUser }),
}));

const updateProfileMock = vi.hoisted(() => vi.fn());
vi.mock("@portal/api-client", async () => {
  class ApiRequestError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  }
  return { updateProfile: updateProfileMock, ApiRequestError };
});

import { ApiRequestError } from "@portal/api-client";
import { ProfileForm } from "./ProfileForm";

const currentUser = { id: "u1", email: "ana@portal.mx", name: "Ana Pérez", role: "USER" as const };

afterEach(() => {
  cleanup();
  updateProfileMock.mockReset();
  session.setUser.mockReset();
});

const saveButton = () => screen.getByRole("button", { name: "Guardar cambios" });

describe("ProfileForm", () => {
  it("carga el formulario con los datos actuales", () => {
    render(<ProfileForm user={currentUser} />);
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Ana Pérez");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("ana@portal.mx");
    expect((screen.getByLabelText("Contraseña actual") as HTMLInputElement).value).toBe("");
  });

  it("guarda un cambio de nombre sin pedir contraseña y actualiza la sesión", async () => {
    const updated = { ...currentUser, name: "Ana M. Pérez" };
    updateProfileMock.mockResolvedValue(updated);
    const user = userEvent.setup();
    render(<ProfileForm user={currentUser} />);

    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "Ana M. Pérez");
    await user.click(saveButton());

    await waitFor(() =>
      expect(updateProfileMock).toHaveBeenCalledWith({
        name: "Ana M. Pérez",
        email: "ana@portal.mx",
        currentPassword: undefined,
        newPassword: undefined,
      }),
    );
    expect(session.setUser).toHaveBeenCalledWith(updated);
    expect(await screen.findByText("Tus datos se guardaron correctamente.")).toBeTruthy();
  });

  it("pide la contraseña actual al cambiar el email, sin llamar a la API", async () => {
    const user = userEvent.setup();
    render(<ProfileForm user={currentUser} />);

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "nueva@portal.mx");
    await user.click(saveButton());

    expect(
      await screen.findByText("Ingresa tu contraseña actual para cambiar el email o la contraseña"),
    ).toBeTruthy();
    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  it("envía la contraseña actual y la nueva al cambiar la contraseña", async () => {
    updateProfileMock.mockResolvedValue(currentUser);
    const user = userEvent.setup();
    render(<ProfileForm user={currentUser} />);

    await user.type(screen.getByLabelText("Contraseña actual"), "Usuario1234!");
    await user.type(screen.getByLabelText("Contraseña nueva"), "Nueva12345!");
    await user.click(saveButton());

    await waitFor(() =>
      expect(updateProfileMock).toHaveBeenCalledWith({
        name: "Ana Pérez",
        email: "ana@portal.mx",
        currentPassword: "Usuario1234!",
        newPassword: "Nueva12345!",
      }),
    );
    expect((screen.getByLabelText("Contraseña nueva") as HTMLInputElement).value).toBe("");
  });

  it("valida nombre vacío y contraseña nueva corta sin llamar a la API", async () => {
    const user = userEvent.setup();
    render(<ProfileForm user={currentUser} />);

    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Contraseña actual"), "x");
    await user.type(screen.getByLabelText("Contraseña nueva"), "corta");
    await user.click(saveButton());

    expect(await screen.findByText("Ingresa tu nombre")).toBeTruthy();
    expect(screen.getByText("La contraseña debe tener al menos 8 caracteres")).toBeTruthy();
    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  it("muestra el mensaje de la API (contraseña incorrecta o email repetido)", async () => {
    updateProfileMock.mockRejectedValue(
      new ApiRequestError("La contraseña actual no es correcta", 403),
    );
    const user = userEvent.setup();
    render(<ProfileForm user={currentUser} />);

    await user.type(screen.getByLabelText("Contraseña actual"), "mala");
    await user.type(screen.getByLabelText("Contraseña nueva"), "Nueva12345!");
    await user.click(saveButton());

    expect((await screen.findByRole("alert")).textContent).toBe(
      "La contraseña actual no es correcta",
    );
    expect(session.setUser).not.toHaveBeenCalled();
  });

  it("muestra un mensaje genérico ante un error del servidor", async () => {
    updateProfileMock.mockRejectedValue(new ApiRequestError("boom", 500));
    const user = userEvent.setup();
    render(<ProfileForm user={currentUser} />);
    await user.click(saveButton());
    expect((await screen.findByRole("alert")).textContent).toBe(
      "No pudimos guardar los cambios. Inténtalo de nuevo.",
    );
  });
});
