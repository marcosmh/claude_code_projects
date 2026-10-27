import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { STATUS_LABELS } from "../domain/invoice";
import type { InvoiceResponse } from "../dto/invoice.dto";
import { formatDate, formatMoney } from "../utils/format";

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

// Helvetica (built-in PDF font) lacks the NBSP / narrow space that Intl emits.
const money = (cents: number) => formatMoney(cents).replace(/\s/g, " ");

/** Must be called as a plain function (not via createElement): renderToBuffer rejects a wrapped element. */
export function InvoiceDocument({ invoice }: { invoice: InvoiceResponse }) {
  return (
    <Document title={`Factura ${invoice.number}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Factura</Text>
            <Text style={s.muted}>{invoice.number}</Text>
          </View>
          <View style={s.right}>
            <Text>Emisión: {formatDate(new Date(invoice.issueDate))}</Text>
            <Text>Vencimiento: {formatDate(new Date(invoice.dueDate))}</Text>
            <Text style={s.muted}>Estado: {STATUS_LABELS[invoice.status]}</Text>
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
            <Text style={s.cAmount}>{money(i.amountCents)}</Text>
          </View>
        ))}

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text>Subtotal</Text>
            <Text>{money(invoice.subtotalCents)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>Impuesto ({invoice.taxRate}%)</Text>
            <Text>{money(invoice.taxCents)}</Text>
          </View>
          <View style={[s.totalRow, s.grand]}>
            <Text>Total</Text>
            <Text>{money(invoice.totalCents)}</Text>
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
