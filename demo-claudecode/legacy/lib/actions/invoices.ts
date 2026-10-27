"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setFlash } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { invoiceSchema, STATUS_LABELS, STATUSES } from "@/lib/validators";

export type ActionState = { errors: string[] } | undefined;

function parse(input: unknown) {
  const result = invoiceSchema.safeParse(input);
  if (result.success) return { data: result.data };
  return { errors: [...new Set(result.error.issues.map((i) => i.message))] };
}

function toRecord(data: NonNullable<ReturnType<typeof parse>["data"]>) {
  return {
    clientName: data.clientName,
    clientEmail: data.clientEmail || null,
    clientAddress: data.clientAddress || null,
    issueDate: new Date(data.issueDate),
    dueDate: new Date(data.dueDate),
    status: data.status,
    taxRate: data.taxRate,
    notes: data.notes || null,
  };
}

export async function createInvoice(input: unknown): Promise<ActionState> {
  const { data, errors } = parse(input);
  if (!data) return { errors };

  // El número deriva del id autoincremental, así nunca se repite tras borrar.
  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: { ...toRecord(data), number: `tmp-${randomUUID()}`, items: { create: data.items } },
    });
    return tx.invoice.update({
      where: { id: created.id },
      data: { number: `FAC-${String(created.id).padStart(4, "0")}` },
    });
  });

  await setFlash("success", `Factura ${invoice.number} creada correctamente.`);
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoice(id: number, input: unknown): Promise<ActionState> {
  const { data, errors } = parse(input);
  if (!data) return { errors };

  const invoice = await prisma.invoice.update({
    where: { id },
    data: { ...toRecord(data), items: { deleteMany: {}, create: data.items } },
  });

  await setFlash("success", `Factura ${invoice.number} actualizada.`);
  revalidatePath("/invoices");
  redirect(`/invoices/${id}`);
}

export async function deleteInvoice(id: number) {
  const invoice = await prisma.invoice.delete({ where: { id } });
  await setFlash("success", `Factura ${invoice.number} eliminada.`);
  revalidatePath("/invoices");
  redirect("/invoices");
}

export async function setInvoiceStatus(id: number, status: unknown) {
  const parsed = z.enum(STATUSES).safeParse(status);
  if (!parsed.success) return;

  const invoice = await prisma.invoice.update({ where: { id }, data: { status: parsed.data } });
  await setFlash("success", `Factura ${invoice.number} marcada como ${STATUS_LABELS[parsed.data].toLowerCase()}.`);
  revalidatePath("/invoices");
  redirect(`/invoices/${id}`);
}
