import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/components/pdf/InvoiceDocument";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: RouteContext<"/invoices/[id]/pdf">) {
  const { id } = await ctx.params;
  const invoice = Number.isInteger(Number(id))
    ? await prisma.invoice.findUnique({ where: { id: Number(id) }, include: { items: true } })
    : null;
  if (!invoice) return new Response("Factura no encontrada", { status: 404 });

  const pdf = await renderToBuffer(InvoiceDocument({ invoice }));
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
    },
  });
}
