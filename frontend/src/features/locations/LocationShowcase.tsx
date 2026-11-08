import Link from "next/link";
import { RollLabel } from "@/components/ui/RollLabel";
import { FeaturedPropertiesShowcase } from "../home/FeaturedPropertiesShowcase";
import { pickCollection } from "./location-collection";
import { LocationRetry } from "./LocationRetry";
import type { CollectionState } from "./featured-locations";
import styles from "./locations-index.module.css";

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** Up to three published homes in the Homepage's card rail, or an honest empty/unavailable state. */
export function LocationShowcase({ collection }: { collection: CollectionState }) {
  if (collection.status === "unavailable") {
    return (
      <div className={styles.state} role="status" data-state="unavailable">
        <div className={styles.stateCopy}>
          <h3>Properties are temporarily unavailable</h3>
          <p>Try again in a moment, or browse all properties.</p>
          <div className={styles.stateActions}>
            <LocationRetry />
          </div>
        </div>
      </div>
    );
  }

  const properties = pickCollection(collection.items);
  if (!properties.length) {
    return (
      <div className={styles.state} data-state="empty">
        <div className={styles.stateCopy}>
          <h3>New listings will appear here</h3>
          <p>
            No homes are currently published in our four featured locations. Let us help
            you find your next home.
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
      </div>
    );
  }

  return (
    <>
      <FeaturedPropertiesShowcase properties={properties} embedded />
    </>
  );
}

export function LocationShowcaseSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading properties"
      className={styles.collectionSkeleton}
    >
      <span className={styles.srOnly}>Loading published homes</span>
      {[0, 1, 2].map((index) => (
        <div key={index} className={styles.skeletonCard} aria-hidden="true">
          <div />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
