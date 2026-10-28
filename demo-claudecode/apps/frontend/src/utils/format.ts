/** Código ISO 4217 de la moneda de las facturas; configurable con `VITE_CURRENCY` (por defecto USD). */
export const CURRENCY = import.meta.env.VITE_CURRENCY?.trim().toUpperCase() || "USD";

export const moneyFormatter = (currency: string) => {
  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency });
  } catch {
    // Código de moneda inválido en la configuración: se usa USD en lugar de romper toda la pantalla.
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD" });
  }
};

const formatters = new Map<string, Intl.NumberFormat>();
const formatterFor = (currency: string) => {
  let f = formatters.get(currency);
  if (!f) formatters.set(currency, (f = moneyFormatter(currency)));
  return f;
};
const date = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "UTC" });

/** Formato de presentación de centavos (la aritmética de dinero vive en el backend). */
export const formatMoney = (cents: number, currency: string = CURRENCY) => formatterFor(currency).format(cents / 100);

/** Acepta el ISO del backend (`2026-10-01T00:00:00.000Z`) o `YYYY-MM-DD`. */
export const formatDate = (iso: string) => date.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

/** Valor para `<input type="date">`: los 10 primeros caracteres del ISO. */
export const toDateInput = (iso: string) => iso.slice(0, 10);

/** Fecha local (no UTC) de hoy + `offsetDays`, para `<input type="date">`. */
export const todayInput = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
