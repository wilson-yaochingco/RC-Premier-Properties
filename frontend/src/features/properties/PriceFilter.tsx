"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./property-catalog.module.css";

const compact = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  notation: "compact",
  maximumFractionDigits: 1,
});

function summary(min: string, max: string): string {
  const low = min && Number(min) >= 0 ? compact.format(Number(min)) : "";
  const high = max && Number(max) >= 0 ? compact.format(Number(max)) : "";
  if (low && high) return `${low} – ${high}`;
  if (low) return `From ${low}`;
  if (high) return `Up to ${high}`;
  return "Any price";
}

/**
 * One price control that reveals the min/max inputs. The inputs stay mounted so the form
 * always submits `minPrice` and `maxPrice` exactly as before.
 */
export function PriceFilter({
  minPrice,
  maxPrice,
}: {
  minPrice: string;
  maxPrice: string;
}) {
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(minPrice);
  const [max, setMax] = useState(maxPrice);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className={styles.priceRoot}>
      <button
        type="button"
        className={`${styles.field} ${styles.priceTrigger}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.label}>Price</span>
        <span className={styles.value}>{summary(min, max)}</span>
        <svg className={styles.chevron} viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M2 4.5 6 8.5l4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </button>
      <div id={panelId} className={styles.pricePanel} hidden={!open}>
        <div>
          <label htmlFor="price-min">Minimum price (PHP)</label>
          <input
            id="price-min"
            name="minPrice"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={min}
            placeholder="No minimum"
            onChange={(event) => setMin(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="price-max">Maximum price (PHP)</label>
          <input
            id="price-max"
            name="maxPrice"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={max}
            placeholder="No maximum"
            onChange={(event) => setMax(event.target.value)}
          />
        </div>
        <button
          type="submit"
          className={styles.priceApply}
          onClick={() => setOpen(false)}
        >
          Apply price
        </button>
      </div>
    </div>
  );
}
