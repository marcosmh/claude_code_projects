export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}
