"use client";

import { useState, type ReactNode } from "react";
import styles from "./property-catalog.module.css";

interface FilterDisclosureProps {
  children: ReactNode;
  defaultOpen: boolean;
}

/**
 * Renders the FILTERS toggle and its panel as direct children of the filter grid. The
 * panel stays mounted so collapsed fields still submit their values with the form.
 */
export function FilterDisclosure({ children, defaultOpen }: FilterDisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      <button
        type="button"
        className={styles.filtersToggle}
        aria-expanded={open}
        aria-controls="property-advanced-filters"
        onClick={() => setOpen((value) => !value)}
      >
        More filters
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <div
        id="property-advanced-filters"
        className={styles.advanced}
        data-open={open}
        inert={!open}
      >
        <div className={styles.advancedInner}>
          <div className={styles.advancedGrid}>{children}</div>
        </div>
      </div>
    </>
  );
}
