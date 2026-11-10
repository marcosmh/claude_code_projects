import { afterEach, describe, expect, it, vi } from "vitest";
import { sendInquiryEmail } from "./web3forms";

const inquiry = {
  name: "Ana Pérez",
  email: "ana@example.com",
  phone: "55 1234 5678",
  message: "Me interesa visitar la propiedad.",
  propertyId: "p1",
  propertyTitle: "Casa en Mérida",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("sendInquiryEmail", () => {
  it("envía los datos y el título de la propiedad a Web3Forms con la clave pública", async () => {
    vi.stubEnv("NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY", "clave-publica");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await sendInquiryEmail(inquiry)).toBe(true);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.web3forms.com/submit");
    expect(JSON.parse(init.body as string)).toMatchObject({
      access_key: "clave-publica",
      subject: "Nueva consulta: Casa en Mérida",
      name: "Ana Pérez",
      email: "ana@example.com",
      phone: "55 1234 5678",
      property_id: "p1",
      property_title: "Casa en Mérida",
    });
  });

  it("sin clave configurada no intenta enviar y devuelve false", async () => {
    vi.stubEnv("NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await sendInquiryEmail(inquiry)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devuelve false si Web3Forms rechaza, falla la red o la respuesta no es JSON", async () => {
    vi.stubEnv("NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY", "clave-publica");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ success: false }, { status: 403 })),
    );
    expect(await sendInquiryEmail(inquiry)).toBe(false);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("red")));
    expect(await sendInquiryEmail(inquiry)).toBe(false);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>")));
    expect(await sendInquiryEmail(inquiry)).toBe(false);
  });
});
