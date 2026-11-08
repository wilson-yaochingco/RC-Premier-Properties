import { describe, expect, it } from "vitest";
import {
  displayPrice,
  priceDraft,
  priceRangeError,
  priceToProgress,
  progressToPrice,
  priceStep,
  PRICE_SLIDER_MAX,
  sliderPrice,
  stepPrice,
  PRICE_SLIDER_STEPS,
  wholePriceQuery,
} from "../src/features/properties/property-price-filter";

describe("Properties whole-peso filters", () => {
  it("formats and submits the same rounded whole-peso amount", () => {
    expect(priceDraft("18,213,237.76")).toBe("18213238");
    expect(displayPrice(priceDraft("18,213,237.76"))).toBe("18,213,238");
    expect(wholePriceQuery("8.9e6")).toBe("8900000");
    expect(wholePriceQuery("18213237.76")).toBe("18213238");
    expect(priceDraft("8.9e6")).toBe("8.9e6");
    expect(priceRangeError("8.9e6", "")).toMatchObject({ field: "minimum" });
  });
  it("rejects invalid, negative, reversed and excessive budgets", () => {
    expect(priceRangeError("-1", "")).toMatchObject({ field: "minimum" });
    expect(priceRangeError("5000000", "1000000")).toMatchObject({ field: "maximum" });
    expect(priceRangeError("", "1000000000001")).toMatchObject({ field: "maximum" });
    expect(priceRangeError("", "")).toBeUndefined();
  });
  it("keeps most of the track below 30M and round-trips whole-peso prices", () => {
    expect(PRICE_SLIDER_MAX).toBe(100000000);
    expect(priceToProgress(10000000)).toBe(50);
    expect(priceToProgress(30000000)).toBe(75);
    expect(priceToProgress(100000000)).toBe(100);
    for (const price of [0, 8750000, 21000000, 50000000, 100000000]) {
      expect(progressToPrice(priceToProgress(price))).toBe(price);
    }
    expect(priceToProgress(150000000)).toBe(100);
  });
  it("snaps drag values using sensible price bands and clamps handles", () => {
    expect(priceStep(8750000)).toBe(250000);
    expect(priceStep(21000000)).toBe(500000);
    expect(priceStep(50000000)).toBe(1000000);
    expect(sliderPrice(21234444, 0, 100000000)).toBe("21000000");
    expect(sliderPrice(101000000, 0, 100000000)).toBe("100000000");
    expect(sliderPrice(9000000, 10000000, 30000000)).toBe("10000000");
  });
});

it("moves through the fixed price path at band boundaries and from manual amounts", () => {
  expect(stepPrice(10000000, -1)).toBe(9750000);
  expect(stepPrice(10000000, 1)).toBe(10500000);
  expect(stepPrice(30000000, -1)).toBe(29500000);
  expect(stepPrice(30000000, 1)).toBe(31000000);
  expect(stepPrice(8750123, 1)).toBe(9000000);
  expect(stepPrice(8750123, -1)).toBe(8750000);
  expect(sliderPrice(9200000, 0, 9123456)).toBe("9000000");
  for (let amount = 0; amount <= 100000000; amount += 1234567) {
    expect(PRICE_SLIDER_STEPS).toContain(Number(sliderPrice(amount, 0, 100000000)));
  }
});
