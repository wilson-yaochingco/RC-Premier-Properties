import Image from "next/image";
import { FEATURED_LOCATIONS } from "./featured-locations";
import styles from "./locations-index.module.css";

const TILE_SIZES = [
  "(max-width: 63.99rem) 100vw, 36vw",
  "(max-width: 63.99rem) 100vw, 63vw",
  "(max-width: 39.99rem) 100vw, (max-width: 63.99rem) 50vw, 31vw",
  "(max-width: 39.99rem) 100vw, (max-width: 63.99rem) 50vw, 31vw",
] as const;

export function FeaturedLocations() {
  return (
    <div className={styles.mosaic} data-motion="photos" data-motion-stagger="0.16">
      {FEATURED_LOCATIONS.map((location, index) => (
        <article
          key={location.slug}
          className={styles.tile}
          data-motion-frame
          data-tile={location.slug}
          data-position={index}
        >
          <Image
            src={location.scenery.imagePath}
            alt={location.scenery.alt}
            fill
            sizes={TILE_SIZES[index] ?? TILE_SIZES[3]}
            className={styles.tileImage}
          />
          <span className={styles.tileScrim} aria-hidden="true" />
          <div className={styles.tileBody}>
            <h3 className={styles.tileName}>{location.name}</h3>
            <p className={styles.tileText}>{location.description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
