import type { CurrencyRates } from "@/lib/types";

export async function fetchCurrencyRates(): Promise<CurrencyRates> {
  const res = await fetch("/api/currency", { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("Failed to fetch currency rates");
  return res.json();
}

export function convertToEur(
  amount: number,
  currency: string,
  rates: CurrencyRates
): number {
  if (currency === "EUR") return amount;
  if (currency === "UAH") return amount / rates.eurUah;
  if (currency === "USD") return amount / rates.usdEur;
  return amount;
}

export function formatCurrency(amount: number, currency = "EUR"): string {
  const symbols: Record<string, string> = {
    EUR: "€",
    USD: "$",
    UAH: "₴",
  };
  const symbol = symbols[currency] ?? currency;
  const abs = Math.abs(amount);
  const formatted = abs >= 1000
    ? `${(abs / 1000).toFixed(1)}k`
    : abs.toFixed(2);
  return `${amount < 0 ? "-" : ""}${symbol}${formatted}`;
}
