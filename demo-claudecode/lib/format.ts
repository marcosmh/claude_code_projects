export function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}
