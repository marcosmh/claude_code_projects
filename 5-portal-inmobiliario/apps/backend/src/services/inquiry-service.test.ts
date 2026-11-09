import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/errors";
import type { InquiryNotifier } from "@/lib/integrations/web3forms";
import type { InquiryRepository } from "@/repositories/inquiry-repository";
import { createInquiryService } from "./inquiry-service";

const input = {
  propertyId: "p1",
  name: "Ana Pérez",
  email: "ana@example.com",
  phone: "+52 55 1234 5678",
  message: "Me interesa visitar la propiedad.",
};

function buildDependencies(overrides: { title?: string | null; send?: InquiryNotifier["send"] }) {
  const repository: InquiryRepository = {
    findPublishedPropertyTitle: vi
      .fn()
      .mockResolvedValue(overrides.title === undefined ? "Casa en Mérida" : overrides.title),
    create: vi.fn().mockResolvedValue({ id: "inq-1" }),
  };
  const notifier: InquiryNotifier = { send: overrides.send ?? vi.fn().mockResolvedValue(true) };
  return { repository, notifier };
}

describe("submitInquiry", () => {
  it("guarda la consulta y la notifica con el id y título de la propiedad", async () => {
    const dependencies = buildDependencies({});
    const result = await createInquiryService(dependencies).submitInquiry(input);

    expect(result).toEqual({ id: "inq-1", notificationSent: true });
    expect(dependencies.repository.create).toHaveBeenCalledWith({
      propertyId: "p1",
      name: "Ana Pérez",
      email: "ana@example.com",
      phone: "+52 55 1234 5678",
      message: "Me interesa visitar la propiedad.",
    });
    expect(dependencies.notifier.send).toHaveBeenCalledWith(
      expect.objectContaining({ propertyId: "p1", propertyTitle: "Casa en Mérida" }),
    );
  });

  it("relaciona la consulta con el usuario autenticado cuando existe", async () => {
    const dependencies = buildDependencies({});
    await createInquiryService(dependencies).submitInquiry(input, "user-1");
    expect(dependencies.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
    );
  });

  it("no envía teléfono cuando el visitante no lo indicó", async () => {
    const dependencies = buildDependencies({});
    await createInquiryService(dependencies).submitInquiry({ ...input, phone: undefined });
    expect(dependencies.repository.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ phone: expect.anything() }),
    );
  });

  it("conserva la consulta y avisa si falla la notificación", async () => {
    const dependencies = buildDependencies({ send: vi.fn().mockResolvedValue(false) });
    const result = await createInquiryService(dependencies).submitInquiry(input);
    expect(result).toEqual({ id: "inq-1", notificationSent: false });
    expect(dependencies.repository.create).toHaveBeenCalledOnce();
  });

  it("lanza NotFoundError y no guarda nada si la propiedad no está publicada", async () => {
    const dependencies = buildDependencies({ title: null });
    await expect(createInquiryService(dependencies).submitInquiry(input)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(dependencies.repository.create).not.toHaveBeenCalled();
    expect(dependencies.notifier.send).not.toHaveBeenCalled();
  });
});
