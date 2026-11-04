"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { RollLabel } from "@/components/ui/RollLabel";
import styles from "./locations-index.module.css";

export interface HomesLocation {
  slug: string;
  name: string;
  href: string;
  /** Count text for the selector: a number, `0 properties`, or `Inventory unavailable`. */
  inventory: string;
  /** Total published properties, when known. */
  count?: number;
  /** `homes` has cards, `empty` is a confirmed zero, `unavailable` could not be retrieved. */
  state: "homes" | "empty" | "unavailable";
  /** Server-rendered property cards (at most three) for the `homes` state. */
  cards?: ReactNode;
}

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Four-location selector over pre-rendered panels: the cards are rendered on the server
 * from the public property API, so switching areas needs no client data fetching. Panels
 * for areas with nothing to show say so truthfully (no published homes versus a failed
 * request) and never substitute sample homes.
 */
export function LocationHomes({ locations }: { locations: HomesLocation[] }) {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState(
    () =>
      (locations.find((location) => location.state === "homes") ?? locations[0])?.slug,
  );

  return (
    <div className={styles.homesBody}>
      <div className={styles.areaTabs} role="group" aria-label="Choose a location">
        {locations.map((location) => (
          <button
            key={location.slug}
            type="button"
            className={styles.areaTab}
            aria-pressed={location.slug === selectedSlug}
            aria-controls={`homes-panel-${location.slug}`}
            onClick={() => setSelectedSlug(location.slug)}
          >
            <span>{location.name}</span>
            <span className={styles.areaTabCount} data-state={location.state}>
              {location.inventory}
            </span>
          </button>
        ))}
      </div>

      {locations.map((location) => (
        <div
          key={location.slug}
          id={`homes-panel-${location.slug}`}
          role="region"
          aria-label={`Homes in ${location.name}`}
          className={styles.homesPanel}
          hidden={location.slug !== selectedSlug}
        >
          {location.state === "homes" ? (
            <>
              <div className={styles.homesPanelHead}>
                <p>
                  {location.count !== undefined && location.count > 3
                    ? `Latest 3 of ${location.count.toLocaleString("en-PH")} published in ${location.name}`
                    : `Published in ${location.name}`}
                </p>
                <Link href={location.href} className={`${styles.quietAction} cta`}>
                  <RollLabel>{`View all in ${location.name}`}</RollLabel>
                  <Arrow />
                </Link>
              </div>
              <div className={styles.homesGrid}>{location.cards}</div>
            </>
          ) : location.state === "empty" ? (
            <div className={styles.state}>
              <p className={styles.stateEyebrow}>No published homes yet</p>
              <h3>{`${location.name} has no published properties right now.`}</h3>
              <p>
                Listings appear here as soon as they are published. In the meantime you
                can browse homes across Pampanga, or tell RC Premier what you are
                looking for.
              </p>
              <div className={styles.stateActions}>
                <Link href="/properties" className={`${styles.primaryAction} cta`}>
                  <RollLabel>Browse all properties</RollLabel>
                  <Arrow />
                </Link>
                <Link href="/contact" className={`${styles.quietAction} cta`}>
                  <RollLabel>Talk to RC Premier</RollLabel>
                  <Arrow />
                </Link>
              </div>
            </div>
          ) : (
            <div className={styles.state} role="status">
              <p className={styles.stateEyebrow}>Inventory unavailable</p>
              <h3>{`We couldn’t load homes in ${location.name} right now.`}</h3>
              <p>
                The property service did not respond, so this is not a confirmed empty
                area. No sample homes have been substituted.
              </p>
              <div className={styles.stateActions}>
                <button
                  type="button"
                  className={`${styles.primaryAction} cta`}
                  onClick={() => router.refresh()}
                >
                  <RollLabel>Try again</RollLabel>
                  <Arrow />
                </button>
                <Link href="/properties" className={`${styles.quietAction} cta`}>
                  <RollLabel>Browse all properties</RollLabel>
                  <Arrow />
                </Link>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
