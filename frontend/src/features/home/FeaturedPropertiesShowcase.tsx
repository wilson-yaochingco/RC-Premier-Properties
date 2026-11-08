import type { PublicPropertySummary } from "@rc/shared";
import { FeaturedPropertyCard } from "./FeaturedPropertyCard";
import { SwipeIndicator } from "./SwipeIndicator";
import styles from "./featured-properties.module.css";

/**
 * Presentation for up to three featured properties. It knows nothing about where the
 * data came from (API or development fixtures); the count only chooses the layout.
 */
export function FeaturedPropertiesShowcase({
  properties,
  embedded = false,
}: {
  properties: readonly PublicPropertySummary[];
  /** Hosts the rail inside another page's container, keeping Home's tokens but none of its section chrome. */
  embedded?: boolean;
}) {
  const rail = (
    <div className={styles.container}>
      <ul
        id="featured-rail"
        className={styles.grid}
        data-motion="group"
        data-count={properties.length}
        role="list"
        aria-label="Featured properties"
      >
        {properties.map((property) => (
          <li key={property.id}>
            <FeaturedPropertyCard property={property} />
          </li>
        ))}
      </ul>
      <SwipeIndicator
        railId="featured-rail"
        count={properties.length}
        until={properties.length > 2 ? "tablet" : "phone"}
      />
    </div>
  );

  return embedded ? (
    <div className={`${styles.section} ${styles.embedded}`}>{rail}</div>
  ) : (
    rail
  );
}
