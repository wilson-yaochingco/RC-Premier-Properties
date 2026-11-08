import Link from "next/link";
import { RollLabel } from "@/components/ui/RollLabel";
import { FEATURED_LOCATIONS } from "../locations/featured-locations";
import { ExplorePampangaMap } from "./ExplorePampangaMap";
import styles from "./explore-pampanga.module.css";

const LOCATIONS = FEATURED_LOCATIONS.map(({ slug, name, href }) => ({
  slug,
  name,
  href,
}));

/** The four curated destinations are permanent, so nothing here waits on inventory. */
export function ExplorePampangaSection() {
  return (
    <section className={styles.section} aria-labelledby="explore-pampanga-heading">
      <div className={styles.container}>
        <ExplorePampangaMap
          locations={LOCATIONS}
          intro={
            <>
              <h2
                id="explore-pampanga-heading"
                className={styles.heading}
                data-motion-step="heading"
              >
                <span>Explore our</span>{" "}
                <span>
                  <em>communities</em>.
                </span>
              </h2>
            </>
          }
          outro={
            <>
              <p className={styles.copy} data-motion-step="fade" data-motion-at="0.95">
                From familiar city streets to quieter residential communities, explore
                locations across Pampanga and find a place that suits your next move.
              </p>
              <Link
                href="/locations"
                className={`${styles.button} cta cta--wrap`}
                data-motion-step="fade"
                data-motion-at="1.1"
              >
                <RollLabel>Explore all locations</RollLabel>
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </Link>
            </>
          }
        />
      </div>
    </section>
  );
}
