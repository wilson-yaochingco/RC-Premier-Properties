import type { ReactNode } from "react";

/**
 * Label for RC Premier text CTAs. It renders the label twice inside a one-line viewport;
 * on hover or focus of the parent `.cta` the pair slides up so the copy replaces the
 * original (see `.cta-roll` in globals.css). The duplicate is hidden from assistive tech.
 */
export function RollLabel({ children }: { children: ReactNode }) {
  return (
    <span className="cta-roll">
      <span className="cta-roll__track">
        <span>{children}</span>
        <span aria-hidden="true">{children}</span>
      </span>
    </span>
  );
}
