"use client";

import { useEffect, useState } from "react";
import styles from "./swipe-indicator.module.css";

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Phone-only position hint for a native scroll-snap rail. It watches the rail's children
 * with an IntersectionObserver and treats the most visible one as active, so there is no
 * scroll handler and no pointer or drag logic. Decorative: hidden from assistive tech.
 */
export function SwipeIndicator({ railId, count }: { railId: string; count: number }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (count < 2) return;
    const rail = document.getElementById(railId);
    if (!rail) return;

    const phone = window.matchMedia("(max-width: 39.99rem)");
    let observer: IntersectionObserver | undefined;

    const observe = () => {
      observer?.disconnect();
      if (!phone.matches) return;

      const ratios = new Map<Element, number>();
      const items = Array.from(rail.children);
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            ratios.set(entry.target, entry.intersectionRatio);
          let best = 0;
          let bestRatio = -1;
          items.forEach((item, index) => {
            const ratio = ratios.get(item) ?? 0;
            if (ratio > bestRatio) {
              best = index;
              bestRatio = ratio;
            }
          });
          setActive(best);
        },
        { root: rail, threshold: [0, 0.25, 0.5, 0.75, 1] },
      );
      items.forEach((item) => observer?.observe(item));
    };

    observe();
    phone.addEventListener("change", observe);
    return () => {
      phone.removeEventListener("change", observe);
      observer?.disconnect();
    };
  }, [railId, count]);

  if (count < 2) return null;

  return (
    <div className={styles.indicator} aria-hidden="true">
      <span className={styles.counter}>
        {pad(active + 1)}
        <span> / {pad(count)}</span>
      </span>
      <span className={styles.track}>
        <span
          className={styles.thumb}
          style={{ width: `${((active + 1) / count) * 100}%` }}
        />
      </span>
    </div>
  );
}
