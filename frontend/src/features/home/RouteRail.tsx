"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./route-cards.module.css";

// Short easing time constant in ms, and a hard cap (px) on how far the label may trail. The cap
// is under half its height, so the cursor always stays inside it, even on a fast flick.
const TRAIL_MS = 40;
const MAX_LAG = 8;

/**
 * The route cards' list. Where the cards overflow into a rail, a mouse can drag it and a
 * floating "Drag" label is centred on the pointer, as on the About gallery. Touch keeps native
 * swiping and the keyboard keeps the links; neither shows the tip.
 */
export function RouteRail({ children }: { children: ReactNode }) {
  const tooltip = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ x: number; scroll: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const frame = useRef<number | undefined>(undefined);
  const following = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => () => stopTrail(), []);

  function stopTrail() {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = undefined;
  }

  function paint() {
    const { x, y } = current.current;
    tooltip.current!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  /** Centres the label on the pointer, kept inside the viewport (the cursor stays within it). */
  function place(clientX: number, clientY: number) {
    const { width: w, height: h } = tooltip.current!.getBoundingClientRect();
    target.current = {
      x: Math.min(Math.max(0, clientX - w / 2), window.innerWidth - w),
      y: Math.min(Math.max(0, clientY - h / 2), window.innerHeight - h),
    };
  }

  /** Pulls the label back to within MAX_LAG of the pointer, so the cursor never leaves it. */
  function limitLag() {
    const c = current.current;
    const t = target.current;
    c.x = t.x - Math.max(-MAX_LAG, Math.min(MAX_LAG, t.x - c.x));
    c.y = t.y - Math.max(-MAX_LAG, Math.min(MAX_LAG, t.y - c.y));
  }

  function trail() {
    if (frame.current !== undefined) return;
    let last = performance.now();
    const step = (now: number) => {
      const ease = 1 - Math.exp(-(now - last) / TRAIL_MS);
      last = now;
      const c = current.current;
      const t = target.current;
      c.x += (t.x - c.x) * ease;
      c.y += (t.y - c.y) * ease;
      limitLag();
      if (Math.abs(t.x - c.x) < 0.1 && Math.abs(t.y - c.y) < 0.1) {
        current.current = { ...t };
        paint();
        frame.current = undefined;
        return;
      }
      paint();
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }

  function endDrag(event: React.PointerEvent<HTMLUListElement>) {
    if (!drag.current) return;
    suppressClick.current = drag.current.moved;
    if (drag.current.moved) {
      // The label comes back under the pointer, not where it was when the drag began.
      place(event.clientX, event.clientY);
      current.current = { ...target.current };
      paint();
    }
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <>
      <ul
        id="route-rail"
        className={styles.grid}
        data-dragging={dragging}
        aria-label="Where to start"
        onPointerEnter={(event) => {
          const rail = event.currentTarget;
          if (
            event.pointerType === "mouse" &&
            matchMedia("(hover: hover) and (pointer: fine)").matches &&
            rail.scrollWidth > rail.clientWidth + 1
          ) {
            // Appear centred on the pointer straight away; only later movement trails.
            place(event.clientX, event.clientY);
            current.current = { ...target.current };
            paint();
            following.current = true;
            setHovering(true);
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse") return;
          stopTrail();
          following.current = false;
          setHovering(false);
        }}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse" || event.button !== 0) return;
          suppressClick.current = false;
          drag.current = {
            x: event.clientX,
            scroll: event.currentTarget.scrollLeft,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse") return;
          if (following.current && !drag.current?.moved) {
            place(event.clientX, event.clientY);
            if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
              current.current = { ...target.current };
              paint();
            } else {
              limitLag();
              paint();
              trail();
            }
          }
          const active = drag.current;
          if (!active) return;
          const delta = event.clientX - active.x;
          if (!active.moved && Math.abs(delta) > 6) {
            active.moved = true;
            stopTrail();
            setDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          if (active.moved) {
            event.preventDefault();
            event.currentTarget.scrollLeft = active.scroll - delta;
          }
        }}
        onPointerUp={endDrag}
        onPointerCancel={(event) => {
          stopTrail();
          endDrag(event);
          suppressClick.current = false;
        }}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
        onDragStart={(event) => event.preventDefault()}
      >
        {children}
      </ul>
      <span
        ref={tooltip}
        className={styles.dragTip}
        data-visible={hovering && !dragging}
        aria-hidden="true"
      >
        Drag
      </span>
    </>
  );
}
