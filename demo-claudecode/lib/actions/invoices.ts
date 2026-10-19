"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { invoiceSchema } from "@/lib/validators";

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

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoice(id: number, input: unknown): Promise<ActionState> {
  const { data, errors } = parse(input);
  if (!data) return { errors };

  await prisma.invoice.update({
    where: { id },
    data: { ...toRecord(data), items: { deleteMany: {}, create: data.items } },
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${id}`);
}

export async function deleteInvoice(id: number) {
  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/invoices");
  redirect("/invoices");
}
