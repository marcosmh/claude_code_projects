export function formatMoney(cents: number, currency: string): string {
  const amount = (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${amount} ${currency}`;
}

export const formatDate = (iso: string): string => iso.slice(0, 10);
