"use client";

import Link from "next/link";
import { useState } from "react";
import { RollLabel } from "@/components/ui/RollLabel";
import {
  PAMPANGA_MAP_AREAS,
  PAMPANGA_MAP_HEIGHT,
  PAMPANGA_MAP_OUTLINE,
  PAMPANGA_MAP_WIDTH,
} from "./pampanga-map-data";
import styles from "./locations-index.module.css";

export interface ExplorerLocation {
  slug: string;
  name: string;
  href: string;
  description: string;
  /** Truthful inventory text: a count, `0 properties`, or `Inventory unavailable`. */
  inventory: string;
  /** `empty` is a confirmed zero; `unavailable` means the count could not be retrieved. */
  state: "homes" | "empty" | "unavailable";
}

/** Where each name sits relative to its map marker, so nearby labels never collide. */
const LABEL_SIDE: Record<string, "left" | "right" | "below"> = {
  "angeles-city": "below",
  "mabalacat-city": "left",
  magalang: "right",
  porac: "right",
};

const percentX = (x: number) => `${(x / PAMPANGA_MAP_WIDTH) * 100}%`;
const percentY = (y: number) => `${(y / PAMPANGA_MAP_HEIGHT) * 100}%`;

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Pampanga map plus a contextual panel for the four curated locations. The buttons are
 * the accessible controls: choosing one selects its area and fills the panel, and hovering
 * or focusing one previews its region. The map itself is a pointer shortcut and carries no
 * focusable elements, so it is hidden from assistive technology.
 */
export function LocationExplorer({ locations }: { locations: ExplorerLocation[] }) {
  const [selectedSlug, setSelectedSlug] = useState(
    () =>
      (locations.find((location) => location.state === "homes") ?? locations[0])?.slug,
  );
  const [previewSlug, setPreviewSlug] = useState<string>();
  const selected = locations.find((location) => location.slug === selectedSlug);
  const highlighted = previewSlug ?? selectedSlug;
  const featured = new Map(locations.map((location) => [location.slug, location]));

  return (
    <div className={styles.explorerGrid}>
      <div className={styles.explorerControls}>
        <div className={styles.selector} role="group" aria-label="Choose a location">
          {locations.map((location) => (
            <button
              key={location.slug}
              type="button"
              className={styles.selectorButton}
              aria-pressed={location.slug === selectedSlug}
              onClick={() => setSelectedSlug(location.slug)}
              onMouseEnter={() => setPreviewSlug(location.slug)}
              onMouseLeave={() => setPreviewSlug(undefined)}
              onFocus={() => setPreviewSlug(location.slug)}
              onBlur={() => setPreviewSlug(undefined)}
            >
              <span>{location.name}</span>
              <span className={styles.selectorCount} data-state={location.state}>
                {location.inventory}
              </span>
            </button>
          ))}
        </div>

        {selected ? (
          <div className={styles.panel} aria-live="polite">
            <p className={styles.panelEyebrow}>Selected area</p>
            <h3 className={styles.panelTitle}>{selected.name}</h3>
            <p className={styles.panelText}>{selected.description}</p>
            <p className={styles.panelInventory} data-state={selected.state}>
              {selected.inventory}
            </p>
            <Link href={selected.href} className={`${styles.primaryAction} cta`}>
              <RollLabel>Explore location</RollLabel>
              <Arrow />
            </Link>
          </div>
        ) : null}
      </div>

      <div className={styles.mapCard}>
        <div className={styles.mapWrap}>
          <svg
            className={styles.map}
            viewBox={`0 0 ${PAMPANGA_MAP_WIDTH} ${PAMPANGA_MAP_HEIGHT}`}
            aria-hidden="true"
            focusable="false"
          >
            {PAMPANGA_MAP_AREAS.map((area) => {
              const location = featured.get(area.slug);
              if (!location)
                return <path key={area.slug} d={area.d} className={styles.area} />;
              return (
                <path
                  key={area.slug}
                  d={area.d}
                  className={styles.area}
                  data-featured="true"
                  data-active={area.slug === highlighted || undefined}
                  onMouseEnter={() => setPreviewSlug(area.slug)}
                  onMouseLeave={() => setPreviewSlug(undefined)}
                  onClick={() => setSelectedSlug(area.slug)}
                />
              );
            })}
            <path d={PAMPANGA_MAP_OUTLINE} className={styles.outline} />
          </svg>
          {PAMPANGA_MAP_AREAS.filter((area) => featured.has(area.slug)).map((area) => (
            <span
              key={area.slug}
              aria-hidden="true"
              className={styles.pin}
              data-active={area.slug === highlighted || undefined}
              data-side={LABEL_SIDE[area.slug] ?? "right"}
              style={{ left: percentX(area.anchor[0]), top: percentY(area.anchor[1]) }}
            >
              <span className={styles.pinDot} />
              <span className={styles.pinLabel}>{featured.get(area.slug)?.name}</span>
            </span>
          ))}
        </div>
        <p className={styles.sourceNote}>
          Boundary data:{" "}
          <a
            href="https://data.humdata.org/dataset/cod-ab-phl"
            rel="noreferrer"
            target="_blank"
          >
            OCHA/NAMRIA/PSA
          </a>{" "}
          ·{" "}
          <a
            href="https://creativecommons.org/licenses/by/3.0/igo/"
            rel="noreferrer"
            target="_blank"
          >
            CC BY 3.0 IGO
          </a>
          . Simplified; areas are approximate.
        </p>
      </div>
    </div>
  );
}
