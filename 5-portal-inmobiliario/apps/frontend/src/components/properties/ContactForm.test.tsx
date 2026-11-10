// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContactForm } from "./ContactForm";

const submitInquiryMock = vi.hoisted(() => vi.fn());
vi.mock("@portal/api-client", () => ({ submitInquiry: submitInquiryMock }));

const sendInquiryEmailMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/web3forms", () => ({ sendInquiryEmail: sendInquiryEmailMock }));

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useInquiredProperties", () => ({
  useInquiredProperties: () => ({ properties: undefined, refresh: refreshMock }),
}));

afterEach(() => {
  cleanup();
  submitInquiryMock.mockReset();
  sendInquiryEmailMock.mockReset().mockResolvedValue(true);
  refreshMock.mockReset();
});

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nombre"), "Ana Pérez");
  await user.type(screen.getByLabelText("Email"), "ana@example.com");
  await user.type(screen.getByLabelText(/Teléfono/), "+52 55 1234 5678");
  await user.type(screen.getByLabelText("Mensaje"), "Me interesa visitar la propiedad.");
}

describe("ContactForm", () => {
  it("envía los datos junto con el id de la propiedad y muestra el éxito", async () => {
    submitInquiryMock.mockResolvedValue({ id: "i1" });
    const user = userEvent.setup();
    render(<ContactForm propertyId="p1" propertyTitle="Casa en Mérida" />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Enviar consulta" }));

    await waitFor(() =>
      expect(submitInquiryMock).toHaveBeenCalledWith({
        propertyId: "p1",
        name: "Ana Pérez",
        email: "ana@example.com",
        phone: "+52 55 1234 5678",
        message: "Me interesa visitar la propiedad.",
      }),
    );
    expect(await screen.findByText("¡Consulta enviada!")).toBeTruthy();
    expect(screen.getByText(/Casa en Mérida/)).toBeTruthy();
  });

  it("omite el teléfono cuando se deja vacío", async () => {
    submitInquiryMock.mockResolvedValue({ id: "i1" });
    const user = userEvent.setup();
    render(<ContactForm propertyId="p1" propertyTitle="Casa" />);
    await user.type(screen.getByLabelText("Nombre"), "Ana Pérez");
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText("Mensaje"), "Me interesa visitar la propiedad.");
    await user.click(screen.getByRole("button", { name: "Enviar consulta" }));
    await waitFor(() => expect(submitInquiryMock).toHaveBeenCalledOnce());
    expect(submitInquiryMock.mock.calls[0]?.[0]).not.toHaveProperty("phone", "");
    expect(submitInquiryMock.mock.calls[0]?.[0].phone).toBeUndefined();
  });

  it("valida los datos y no envía nada si son inválidos", async () => {
    const user = userEvent.setup();
    render(<ContactForm propertyId="p1" propertyTitle="Casa" />);
    await user.type(screen.getByLabelText("Email"), "no-es-email");
    await user.type(screen.getByLabelText("Mensaje"), "corto");
    await user.click(screen.getByRole("button", { name: "Enviar consulta" }));

    expect(await screen.findByText("Ingresa tu nombre")).toBeTruthy();
    expect(screen.getByText("Ingresa un email válido")).toBeTruthy();
    expect(screen.getByText(/al menos 10 caracteres/)).toBeTruthy();
    expect(submitInquiryMock).not.toHaveBeenCalled();
  });

  it("deshabilita el botón y muestra 'Enviando…' mientras envía", async () => {
    let resolveSubmission: (value: unknown) => void = () => undefined;
    submitInquiryMock.mockReturnValue(new Promise((resolve) => (resolveSubmission = resolve)));
    const user = userEvent.setup();
    render(<ContactForm propertyId="p1" propertyTitle="Casa" />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Enviar consulta" }));

    const sendingButton = await screen.findByRole("button", { name: "Enviando…" });
    expect((sendingButton as HTMLButtonElement).disabled).toBe(true);
    resolveSubmission({ id: "i1" });
    expect(await screen.findByText("¡Consulta enviada!")).toBeTruthy();
  });

  it("muestra el error, conserva lo escrito y permite reintentar", async () => {
    submitInquiryMock.mockRejectedValueOnce(new Error("fallo"));
    const user = userEvent.setup();
    render(<ContactForm propertyId="p1" propertyTitle="Casa" />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Enviar consulta" }));

    expect(await screen.findByText(/No pudimos enviar tu consulta/)).toBeTruthy();
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Ana Pérez");

    submitInquiryMock.mockResolvedValueOnce({ id: "i1" });
    await user.click(screen.getByRole("button", { name: "Enviar consulta" }));
    expect(await screen.findByText("¡Consulta enviada!")).toBeTruthy();
  });

  it("permite enviar otra consulta tras el éxito", async () => {
    submitInquiryMock.mockResolvedValue({ id: "i1" });
    const user = userEvent.setup();
    render(<ContactForm propertyId="p1" propertyTitle="Casa" />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Enviar consulta" }));
    await user.click(await screen.findByRole("button", { name: "Enviar otra consulta" }));
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("");
  });

  it("tras guardar envía el correo desde el navegador con el título de la propiedad", async () => {
    submitInquiryMock.mockResolvedValue({ id: "i1" });
    const user = userEvent.setup();
    render(<ContactForm propertyId="p1" propertyTitle="Casa en Mérida" />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Enviar consulta" }));

    await screen.findByText("¡Consulta enviada!");
    expect(sendInquiryEmailMock).toHaveBeenCalledWith({
      propertyId: "p1",
      propertyTitle: "Casa en Mérida",
      name: "Ana Pérez",
      email: "ana@example.com",
      phone: "+52 55 1234 5678",
      message: "Me interesa visitar la propiedad.",
    });
    expect(refreshMock).toHaveBeenCalledOnce();
    expect(screen.queryByText(/no pudimos enviar el aviso por correo/)).toBeNull();
  });

  it("avisa que quedó guardada si falla el correo, sin mostrar error de envío", async () => {
    submitInquiryMock.mockResolvedValue({ id: "i1" });
    sendInquiryEmailMock.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<ContactForm propertyId="p1" propertyTitle="Casa" />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Enviar consulta" }));

    expect(await screen.findByText(/no pudimos enviar el aviso por correo/)).toBeTruthy();
    expect(screen.queryByText(/No pudimos enviar tu consulta/)).toBeNull();
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("si no se pudo guardar no envía correo ni refresca la lista", async () => {
    submitInquiryMock.mockRejectedValue(new Error("fallo"));
    const user = userEvent.setup();
    render(<ContactForm propertyId="p1" propertyTitle="Casa" />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Enviar consulta" }));

    expect(await screen.findByText(/No pudimos enviar tu consulta/)).toBeTruthy();
    expect(sendInquiryEmailMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
