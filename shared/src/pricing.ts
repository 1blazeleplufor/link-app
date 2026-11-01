/** Order pricing. Amounts are handled in minor units (cents) to avoid floating-point errors. */
export type Currency = "EUR" | "GBP" | "USD" | (string & {});

export interface PricingInput {
  unitPriceMinor: number;      // price of one ticket, taxes included (EU display rule)
  quantity: number;
  linkFeeRate?: number;        // 0 at launch (free); e.g. 0.05 later if contractually allowed
  linkFeeFixedMinor?: number;  // per-order fixed fee, 0 at launch
  vatRate?: number;            // VAT already included in unit price; used only to show the tax share
}

export interface PriceBreakdown {
  subtotalMinor: number;
  feesMinor: number;
  taxesIncludedMinor: number;
  totalMinor: number;
}

export const MAX_TICKETS_PER_ORDER = 10;

export function priceOrder(i: PricingInput): PriceBreakdown {
  if (!Number.isInteger(i.unitPriceMinor) || i.unitPriceMinor < 0) throw new RangeError("unitPriceMinor must be a non-negative integer");
  if (!Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > MAX_TICKETS_PER_ORDER) throw new RangeError(`quantity must be 1..${MAX_TICKETS_PER_ORDER}`);
  const rate = i.linkFeeRate ?? 0;
  if (rate < 0 || rate > 0.3) throw new RangeError("linkFeeRate out of bounds");
  const subtotalMinor = i.unitPriceMinor * i.quantity;
  const feesMinor = subtotalMinor === 0 ? 0 : Math.round(subtotalMinor * rate) + (i.linkFeeFixedMinor ?? 0);
  const vat = i.vatRate ?? 0;
  const taxesIncludedMinor = vat > 0 ? Math.round(subtotalMinor - subtotalMinor / (1 + vat)) : 0;
  return { subtotalMinor, feesMinor, taxesIncludedMinor, totalMinor: subtotalMinor + feesMinor };
}

export function formatMoney(minor: number, currency: Currency, locale: string): string {
  const value = minor / 100;
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: minor % 100 === 0 ? 0 : 2 }).format(value);
}

/** Price label shown on event cards: unknown prices are said to be unknown, never invented. */
export function priceLabel(minPriceMinor: number | null | undefined, currency: Currency, locale: string, t: (k: string, v?: Record<string, string>) => string): string {
  if (minPriceMinor === null || minPriceMinor === undefined) return t("price_unknown");
  if (minPriceMinor === 0) return t("free");
  return t("from", { p: formatMoney(minPriceMinor, currency, locale) });
}
