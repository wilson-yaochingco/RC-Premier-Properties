"use client";

import Link from "next/link";
import { useState } from "react";
import {
  PAMPANGA_MAP_AREAS,
  PAMPANGA_MAP_HEIGHT,
  PAMPANGA_MAP_OUTLINE,
  PAMPANGA_MAP_WIDTH,
} from "../locations/pampanga-map-data";
import { EXPLORE_INDEX_LIMIT, type ExploreLocation } from "./explore-pampanga";
import styles from "./explore-pampanga.module.css";

const pad2 = (n: number) => String(n).padStart(2, "0");
const percentX = (x: number) => `${(x / PAMPANGA_MAP_WIDTH) * 100}%`;
const percentY = (y: number) => `${(y / PAMPANGA_MAP_HEIGHT) * 100}%`;

/**
 * The Pampanga map plus its numbered location ledger. With no locations it renders the
 * muted map alone. The ledger is the dependable navigation path; the map only mirrors it.
 */
export function ExplorePampangaMap({ locations }: { locations: ExploreLocation[] }) {
  const [selectedSlug, setSelectedSlug] = useState(locations[0]?.slug);
  const active = new Map(locations.map((location) => [location.slug, location]));
  // The ledger and the map's numbered markers share one list, so 01-04 always agree.
  const indexed = locations.slice(0, EXPLORE_INDEX_LIMIT);
  const selected = selectedSlug ? active.get(selectedSlug) : undefined;
  const areaBySlug = new Map(PAMPANGA_MAP_AREAS.map((area) => [area.slug, area]));

  return (
    <div className={styles.stage}>
      <div className={styles.mapWrap}>
        <svg
          className={styles.map}
          viewBox={`0 0 ${PAMPANGA_MAP_WIDTH} ${PAMPANGA_MAP_HEIGHT}`}
          role="img"
          aria-label={
            locations.length
              ? `Map of Pampanga highlighting ${locations.length} ${locations.length === 1 ? "area" : "areas"} with properties`
              : "Map of Pampanga"
          }
        >
          {PAMPANGA_MAP_AREAS.map((area) => {
            const location = active.get(area.slug);
            if (!location) {
              return <path key={area.slug} d={area.d} className={styles.area} />;
            }
            return (
              <a
                key={area.slug}
                href={location.href}
                tabIndex={-1}
                onMouseEnter={() => setSelectedSlug(location.slug)}
              >
                <path
                  d={area.d}
                  className={styles.area}
                  data-active="true"
                  data-selected={location.slug === selected?.slug}
                />
              </a>
            );
          })}
          <path d={PAMPANGA_MAP_OUTLINE} className={styles.outline} />
        </svg>

        {indexed.map((location, i) => {
          const area = areaBySlug.get(location.slug);
          if (!area) return null;
          return (
            <span
              key={location.slug}
              aria-hidden="true"
              className={styles.marker}
              data-selected={location.slug === selected?.slug}
              style={{ left: percentX(area.anchor[0]), top: percentY(area.anchor[1]) }}
            >
              {pad2(i + 1)}
            </span>
          );
        })}
      </div>

      {indexed.length ? (
        <ol className={styles.ledger}>
          {indexed.map((location, i) => (
            <li key={location.slug}>
              <Link
                href={location.href}
                className={styles.row}
                data-selected={location.slug === selected?.slug}
                onMouseEnter={() => setSelectedSlug(location.slug)}
                onFocus={() => setSelectedSlug(location.slug)}
              >
                <span className={styles.rowNumber} aria-hidden="true">
                  {pad2(i + 1)}
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowName}>{location.name}</span>
                  <span className={styles.rowCount}>{location.countLabel}</span>
                </span>
                <span className={styles.rowAction} aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
