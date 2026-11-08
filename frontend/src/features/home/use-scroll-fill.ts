import { useEffect, useRef, useState } from "react";

/** Characters resolve over a trailing window so the fill sweeps rather than switches. */
const FILL_SOFTNESS = 10;

/**
 * The RC Premier scroll-text behaviour: as the element scrolls into view, its `[data-char]`
 * children progressively fill from a muted tone to the full text colour. `active` is false
 * under `prefers-reduced-motion` (and before mount), so the text renders fully filled.
 * Pair it with `ScrollFillText` and `data-scrub="on"` on an ancestor when `active`.
 */
export function useScrollFill<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const element = ref.current;
    if (!element) return;

    const chars = element.querySelectorAll<HTMLElement>("[data-char]");
    let frame = 0;
    const update = () => {
      frame = 0;
      const { top } = element.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.min(Math.max((vh * 0.85 - top) / (vh * 0.5), 0), 1);
      const head = progress * (chars.length + FILL_SOFTNESS);
      chars.forEach((char, i) => {
        const fill = Math.min(Math.max((head - i) / FILL_SOFTNESS, 0), 1);
        char.style.setProperty("--fill", fill.toFixed(3));
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    setActive(true);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return { ref, active };
}
