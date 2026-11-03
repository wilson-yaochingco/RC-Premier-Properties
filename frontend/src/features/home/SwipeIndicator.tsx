"use client";

import { useEffect, useState } from "react";
import styles from "./swipe-indicator.module.css";

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Position hint for a native scroll-snap rail. It watches the rail's children
 * with an IntersectionObserver and treats the most visible one as active, so there is no
 * scroll handler and no pointer or drag logic. Decorative: hidden from assistive tech.
 */
export function SwipeIndicator({
  railId,
  count,
  until = "phone",
}: {
  railId: string;
  count: number;
  /** Widest viewport at which the rail is a rail: phones only, or up to 1024px. */
  until?: "phone" | "tablet";
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (count < 2) return;
    const rail = document.getElementById(railId);
    if (!rail) return;

    const phone = window.matchMedia(
      until === "tablet" ? "(max-width: 64rem)" : "(max-width: 39.99rem)",
    );
    let observer: IntersectionObserver | undefined;
    let frame: number | undefined;
    let detach: (() => void) | undefined;

    const observe = () => {
      observer?.disconnect();
      detach?.();
      detach = undefined;
      if (!phone.matches) return;

      const ratios = new Map<Element, number>();
      const items = Array.from(rail.children);

      // The ends are decided by scroll position, never by "most visible": on a tablet two
      // cards are fully visible at the end and the lower one would otherwise win, leaving
      // the last card showing "02 / 03".
      const resolve = () => {
        if (rail.scrollLeft <= 2) return 0;
        if (rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2)
          return items.length - 1;
        let best = 0;
        let bestRatio = -1;
        items.forEach((item, index) => {
          const ratio = ratios.get(item) ?? 0;
          if (ratio > bestRatio) {
            best = index;
            bestRatio = ratio;
          }
        });
        return best;
      };

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            ratios.set(entry.target, entry.intersectionRatio);
          setActive(resolve());
        },
        { root: rail, threshold: [0, 0.25, 0.5, 0.75, 1] },
      );
      items.forEach((item) => observer?.observe(item));

      // A passive, frame-throttled scroll listener only so the final position is caught.
      const onScroll = () => {
        if (frame !== undefined) return;
        frame = window.requestAnimationFrame(() => {
          frame = undefined;
          setActive(resolve());
        });
      };
      rail.addEventListener("scroll", onScroll, { passive: true });
      detach = () => rail.removeEventListener("scroll", onScroll);
    };

    observe();
    phone.addEventListener("change", observe);
    return () => {
      phone.removeEventListener("change", observe);
      observer?.disconnect();
      detach?.();
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [railId, count, until]);

  if (count < 2) return null;

  return (
    <div className={styles.indicator} data-until={until} aria-hidden="true">
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
