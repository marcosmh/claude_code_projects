const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "UTC" });

/** Formato de presentación de centavos (la aritmética de dinero vive en el backend). */
export const formatMoney = (cents: number) => money.format(cents / 100);

/** Acepta el ISO del backend (`2026-10-01T00:00:00.000Z`) o `YYYY-MM-DD`. */
export const formatDate = (iso: string) => date.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

/** Valor para `<input type="date">`: los 10 primeros caracteres del ISO. */
export const toDateInput = (iso: string) => iso.slice(0, 10);

export const todayInput = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
