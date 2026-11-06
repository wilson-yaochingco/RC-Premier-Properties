"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  PAMPANGA_MAP_AREAS,
  PAMPANGA_MAP_HEIGHT,
  PAMPANGA_MAP_OUTLINE,
  PAMPANGA_MAP_WIDTH,
} from "../locations/pampanga-map-data";
import styles from "./explore-pampanga.module.css";

interface ExploreLocation {
  slug: string;
  name: string;
  href: string;
}

/**
 * The split body of the section: copy and the location list on the left, the map on the
 * right. The list holds the real links (keyboard and assistive tech); the map is a pointer
 * shortcut, so it carries no focusable elements. Hover or focus on either side highlights the
 * matching area through one shared slug.
 */
export function ExplorePampangaMap({
  locations,
  intro,
  outro,
}: {
  locations: readonly ExploreLocation[];
  intro: ReactNode;
  outro: ReactNode;
}) {
  const router = useRouter();
  const [activeSlug, setActiveSlug] = useState<string>();
  const featured = new Map(locations.map((location) => [location.slug, location]));

  return (
    <div className={styles.split}>
      <div className={styles.content}>
        <div>{intro}</div>
        <ul className={styles.list}>
          {locations.map((location) => (
            <li key={location.slug}>
              <Link
                href={location.href}
                className={styles.row}
                data-active={location.slug === activeSlug}
                onMouseEnter={() => setActiveSlug(location.slug)}
                onMouseLeave={() => setActiveSlug(undefined)}
                onFocus={() => setActiveSlug(location.slug)}
                onBlur={() => setActiveSlug(undefined)}
              >
                <span>{location.name}</span>
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
        <div className={styles.outro}>{outro}</div>
      </div>

      <div className={styles.panel}>
        <svg
          className={styles.map}
          viewBox={`0 0 ${PAMPANGA_MAP_WIDTH} ${PAMPANGA_MAP_HEIGHT}`}
          role="img"
          aria-label="Map of Pampanga highlighting Angeles City, Mabalacat City, Magalang and Porac"
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
                data-active={area.slug === activeSlug}
                onClick={() => router.push(location.href)}
                onMouseEnter={() => setActiveSlug(area.slug)}
                onMouseLeave={() => setActiveSlug(undefined)}
              />
            );
          })}
          <path d={PAMPANGA_MAP_OUTLINE} className={styles.outline} />
        </svg>
      </div>
    </div>
  );
}
