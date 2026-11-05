import Image from "next/image";
import Link from "next/link";
import { RollLabel } from "@/components/ui/RollLabel";
import { FEATURED_LOCATIONS } from "./featured-locations";
import styles from "./locations-index.module.css";

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const TILE_SIZES = [
  "(max-width: 63.99rem) 100vw, 46vw",
  "(max-width: 63.99rem) 100vw, 54vw",
  "(max-width: 63.99rem) 100vw, 27vw",
  "(max-width: 63.99rem) 100vw, 27vw",
] as const;

/** Permanent destinations, independent of published inventory. */
export function FeaturedLocations() {
  return (
    <>
      <div className={styles.mosaic}>
        {FEATURED_LOCATIONS.map((location, index) => {
          return (
            <article
              key={location.slug}
              className={styles.tile}
              data-tile={location.slug}
              data-position={index}
            >
              <Link href={location.href} className={`${styles.tileLink} cta`}>
                <Image
                  src={location.scenery.imagePath}
                  alt={location.scenery.alt}
                  fill
                  sizes={TILE_SIZES[index] ?? TILE_SIZES[3]}
                  className={styles.tileImage}
                  {...(index === 0 ? { preload: true } : {})}
                />
                <span className={styles.tileScrim} aria-hidden="true" />
                <span className={styles.tileBody}>
                  <h3 className={styles.tileName}>{location.name}</h3>
                  <span className={styles.tileText}>{location.description}</span>
                  <span className={styles.tileAction}>
                    <RollLabel>Explore location</RollLabel>
                    <Arrow />
                  </span>
                </span>
              </Link>
            </article>
          );
        })}
      </div>
    </>
  );
}
