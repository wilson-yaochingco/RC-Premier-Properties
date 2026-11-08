export const MAX_FILTER_PRICE = 1_000_000_000_000;
export const wholePesos = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 });
export const pesos = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export function priceDraft(value: string): string {
  const raw = value.replace(/,/g, "").replace(/^₱\s*/, "").trim();
  return /^\d+(?:\.\d*)?$/.test(raw) && Number.isFinite(Number(raw))
    ? String(Math.round(Number(raw)))
    : raw;
}

export function validPrice(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) <= MAX_FILTER_PRICE;
}

export function displayPrice(value: string): string {
  return validPrice(value) ? wholePesos.format(Number(value)) : value;
}

export function priceRangeError(minimum: string, maximum: string) {
  if (minimum && !validPrice(minimum))
    return {
      field: "minimum",
      message: "Enter a whole-peso minimum between 0 and 1,000,000,000,000",
    };
  if (maximum && !validPrice(maximum))
    return {
      field: "maximum",
      message: "Enter a whole-peso maximum between 0 and 1,000,000,000,000",
    };
  if (minimum && maximum && Number(minimum) > Number(maximum))
    return { field: "maximum", message: "Maximum price must be at least the minimum" };
}

export const PRICE_SLIDER_MAX = 100_000_000;

/** Half the track serves 0-10M, the next quarter 10-30M, and the rest 30-100M. */
export function priceToProgress(amount: number): number {
  const price = Math.max(0, Math.min(PRICE_SLIDER_MAX, amount));
  if (price <= 10_000_000) return (price / 10_000_000) * 50;
  if (price <= 30_000_000) return 50 + ((price - 10_000_000) / 20_000_000) * 25;
  return 75 + ((price - 30_000_000) / 70_000_000) * 25;
}

export function progressToPrice(progress: number): number {
  const position = Math.max(0, Math.min(100, progress));
  if (position <= 50) return Math.round((position / 50) * 10_000_000);
  if (position <= 75)
    return Math.round(10_000_000 + ((position - 50) / 25) * 20_000_000);
  return Math.round(30_000_000 + ((position - 75) / 25) * 70_000_000);
}

export function priceStep(value: number): number {
  return value < 10_000_000 ? 250_000 : value < 30_000_000 ? 500_000 : 1_000_000;
}

export const PRICE_SLIDER_STEPS = [
  ...Array.from({ length: 41 }, (_, index) => index * 250_000),
  ...Array.from({ length: 40 }, (_, index) => 10_000_000 + (index + 1) * 500_000),
  ...Array.from({ length: 70 }, (_, index) => 30_000_000 + (index + 1) * 1_000_000),
];

export function stepPrice(value: number, direction: -1 | 1, count = 1): number {
  const candidates =
    direction === 1
      ? PRICE_SLIDER_STEPS.filter((price) => price > value)
      : PRICE_SLIDER_STEPS.filter((price) => price < value).reverse();
  return (
    candidates[Math.min(count, candidates.length) - 1] ??
    (direction === 1 ? PRICE_SLIDER_MAX : 0)
  );
}

export function sliderPrice(value: number, min: number, max: number): string {
  const allowed = PRICE_SLIDER_STEPS.filter((price) => price >= min && price <= max);
  return String(
    allowed.reduce(
      (nearest, price) =>
        Math.abs(price - value) < Math.abs(nearest - value) ? price : nearest,
      allowed[0],
    ),
  );
}

/** Canonicalize old decimal/exponent URLs without altering listing records. */
export function wholePriceQuery(value: string): string | undefined {
  const amount = Number(value.replace(/,/g, ""));
  return value.trim() &&
    Number.isFinite(amount) &&
    amount >= 0 &&
    amount <= MAX_FILTER_PRICE
    ? String(Math.round(amount))
    : undefined;
}
