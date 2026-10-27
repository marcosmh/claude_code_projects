import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDate, formatMoney } from "@/lib/format";
import { calcTotals } from "@/lib/totals";
import { STATUS_LABELS, STATUSES } from "@/lib/validators";

type Invoice = {
  number: string;
  clientName: string;
  clientEmail: string | null;
  clientAddress: string | null;
  issueDate: Date;
  dueDate: Date;
  status: string;
  taxRate: number;
  notes: string | null;
  items: { id: number; description: string; quantity: number; unitPriceCents: number }[];
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#171717" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  muted: { color: "#52525b" },
  bold: { fontFamily: "Helvetica-Bold" },
  right: { textAlign: "right" },
  parties: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  row: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#e4e4e7" },
  head: { color: "#52525b", fontFamily: "Helvetica-Bold" },
  cDesc: { flex: 1 },
  cQty: { width: 50, textAlign: "right" },
  cPrice: { width: 80, textAlign: "right" },
  cAmount: { width: 90, textAlign: "right" },
  totals: { marginTop: 16, marginLeft: "auto", width: 200 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: { borderTopWidth: 1, borderTopColor: "#171717", marginTop: 4, paddingTop: 4, fontFamily: "Helvetica-Bold", fontSize: 12 },
  notes: { marginTop: 28 },
});

// Helvetica (fuente estándar del PDF) no tiene el espacio fino/NBSP que emite Intl.
const money = (cents: number) => formatMoney(cents).replace(/\s/g, " ");

export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const totals = calcTotals(invoice.items, invoice.taxRate);
  const status = (STATUSES as readonly string[]).includes(invoice.status)
    ? STATUS_LABELS[invoice.status as (typeof STATUSES)[number]]
    : invoice.status;

  return (
    <Document title={`Factura ${invoice.number}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Factura</Text>
            <Text style={s.muted}>{invoice.number}</Text>
          </View>
          <View style={s.right}>
            <Text>Emisión: {formatDate(invoice.issueDate)}</Text>
            <Text>Vencimiento: {formatDate(invoice.dueDate)}</Text>
            <Text style={s.muted}>Estado: {status}</Text>
          </View>
        </View>

        <View style={s.parties}>
          <View>
            <Text style={[s.muted, { marginBottom: 2 }]}>Facturar a</Text>
            <Text style={s.bold}>{invoice.clientName}</Text>
            {invoice.clientEmail && <Text>{invoice.clientEmail}</Text>}
            {invoice.clientAddress && <Text>{invoice.clientAddress}</Text>}
          </View>
        </View>

        <View style={s.row}>
          <Text style={[s.head, s.cDesc]}>Descripción</Text>
          <Text style={[s.head, s.cQty]}>Cant.</Text>
          <Text style={[s.head, s.cPrice]}>Precio</Text>
          <Text style={[s.head, s.cAmount]}>Importe</Text>
        </View>
        {invoice.items.map((i) => (
          <View key={i.id} style={s.row} wrap={false}>
            <Text style={s.cDesc}>{i.description}</Text>
            <Text style={s.cQty}>{i.quantity}</Text>
            <Text style={s.cPrice}>{money(i.unitPriceCents)}</Text>
            <Text style={s.cAmount}>{money(Math.round(i.quantity * i.unitPriceCents))}</Text>
          </View>
        ))}

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text>Subtotal</Text>
            <Text>{money(totals.subtotalCents)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>Impuesto ({invoice.taxRate}%)</Text>
            <Text>{money(totals.taxCents)}</Text>
          </View>
          <View style={[s.totalRow, s.grand]}>
            <Text>Total</Text>
            <Text>{money(totals.totalCents)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={s.notes}>
            <Text style={s.muted}>Notas</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
