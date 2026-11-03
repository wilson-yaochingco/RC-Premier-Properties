"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  PAMPANGA_MAP_AREAS,
  PAMPANGA_MAP_HEIGHT,
  PAMPANGA_MAP_OUTLINE,
  PAMPANGA_MAP_WIDTH,
} from "./pampanga-map-data";
import { homesLabel } from "./location-labels";
import styles from "./location-atlas.module.css";

export interface AtlasLocation {
  slug: string;
  name: string;
  href: string;
  count: number;
}

const pad2 = (value: number) => String(value).padStart(2, "0");
const percentX = (x: number) => `${(x / PAMPANGA_MAP_WIDTH) * 100}%`;
const percentY = (y: number) => `${(y / PAMPANGA_MAP_HEIGHT) * 100}%`;

/**
 * Pampanga atlas: the numbered ledger holds the real links (keyboard and assistive tech);
 * the map mirrors the ledger's selection and offers a pointer shortcut, so it carries no
 * focusable elements inside its image role.
 */
export function LocationAtlas({ locations }: { locations: AtlasLocation[] }) {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState<string>();
  const indexBySlug = new Map(
    locations.map((location, index) => [location.slug, index]),
  );
  const areaBySlug = new Map(PAMPANGA_MAP_AREAS.map((area) => [area.slug, area]));
  const mapped = locations.filter((location) => areaBySlug.has(location.slug));

  return (
    <div className={styles.atlas} data-empty={locations.length === 0 || undefined}>
      <div className={styles.mapColumn}>
        <div className={styles.mapWrap}>
          <svg
            className={styles.map}
            viewBox={`0 0 ${PAMPANGA_MAP_WIDTH} ${PAMPANGA_MAP_HEIGHT}`}
            role="img"
            aria-label={
              mapped.length
                ? `Map of Pampanga highlighting ${mapped.length} ${mapped.length === 1 ? "area" : "areas"} with published homes`
                : "Map of Pampanga"
            }
            onMouseLeave={() => setSelectedSlug(undefined)}
          >
            {PAMPANGA_MAP_AREAS.map((area) => {
              const index = indexBySlug.get(area.slug);
              const location = index === undefined ? undefined : locations[index];
              if (!location) {
                return <path key={area.slug} d={area.d} className={styles.area} />;
              }
              return (
                <g
                  key={area.slug}
                  onClick={() => router.push(location.href)}
                  onMouseEnter={() => setSelectedSlug(location.slug)}
                >
                  <path
                    d={area.d}
                    className={styles.area}
                    data-active="true"
                    data-selected={location.slug === selectedSlug || undefined}
                  />
                </g>
              );
            })}
            <path d={PAMPANGA_MAP_OUTLINE} className={styles.outline} />
          </svg>

          {mapped.map((location) => {
            const area = areaBySlug.get(location.slug)!;
            return (
              <span
                key={location.slug}
                aria-hidden="true"
                className={styles.marker}
                data-selected={location.slug === selectedSlug || undefined}
                style={{
                  left: percentX(area.anchor[0]),
                  top: percentY(area.anchor[1]),
                }}
              >
                {pad2((indexBySlug.get(location.slug) ?? 0) + 1)}
              </span>
            );
          })}
        </div>
      </div>

      {locations.length ? (
        <ol className={styles.ledger} aria-label="Current property locations">
          {locations.map((location, index) => (
            <li key={location.slug}>
              <Link
                href={location.href}
                className={styles.row}
                data-selected={location.slug === selectedSlug || undefined}
                onMouseEnter={() => setSelectedSlug(location.slug)}
                onMouseLeave={() => setSelectedSlug(undefined)}
                onFocus={() => setSelectedSlug(location.slug)}
                onBlur={() => setSelectedSlug(undefined)}
              >
                <span className={styles.rowNumber} aria-hidden="true">
                  {pad2(index + 1)}
                </span>
                <span className={styles.rowName}>{location.name}</span>
                <span className={styles.rowCount}>{homesLabel(location.count)}</span>
                <span className={styles.rowArrow} aria-hidden="true">
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
