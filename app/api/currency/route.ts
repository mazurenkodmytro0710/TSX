import { NextResponse } from "next/server";

interface MonobankRate {
  currencyCodeA: number;
  currencyCodeB: number;
  rateSell?: number;
  rateBuy?: number;
  rateCross?: number;
}

export const revalidate = 3600; // 1 hour cache

export async function GET() {
  try {
    const res = await fetch("https://api.monobank.ua/bank/currency", {
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error("Monobank API error");

    const rates = (await res.json()) as MonobankRate[];

    // ISO 4217: EUR=978, USD=840, UAH=980
    const eurUahRate = rates.find(
      (r) => r.currencyCodeA === 978 && r.currencyCodeB === 980
    );
    const usdUahRate = rates.find(
      (r) => r.currencyCodeA === 840 && r.currencyCodeB === 980
    );

    const eurUah = eurUahRate?.rateSell ?? eurUahRate?.rateCross ?? 45;
    const usdUah = usdUahRate?.rateSell ?? usdUahRate?.rateCross ?? 42;
    const usdEur = eurUah > 0 ? usdUah / eurUah : 0.93;

    return NextResponse.json({
      eurUah,
      usdUah,
      usdEur,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Fallback rates
    return NextResponse.json({
      eurUah: 45,
      usdUah: 42,
      usdEur: 0.93,
      updatedAt: new Date().toISOString(),
    });
  }
}
