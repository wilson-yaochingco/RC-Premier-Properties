"use client";

import { useEffect } from "react";

const hydrated = new Set<string>();

/** Whether the Suspense boundary behind `data-motion-gate="<gate>"` has hydrated. */
export const isMotionGateHydrated = (gate: string) => hydrated.has(gate);

/**
 * Placed inside a Suspense boundary, this mounts only once that boundary's server HTML has
 * been hydrated (or client-rendered). PageMotion leaves everything under a matching
 * `data-motion-gate` untouched until then, so it never edits markup React still has to claim.
 */
export function MotionHydrated({ gate }: { gate: string }) {
  useEffect(() => {
    hydrated.add(gate);
    window.dispatchEvent(new Event("motion:hydrated"));
    return () => {
      hydrated.delete(gate);
    };
  }, [gate]);
  return null;
}
