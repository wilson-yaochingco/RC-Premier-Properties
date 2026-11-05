import Link from "next/link";
import { RollLabel } from "@/components/ui/RollLabel";
import { pickShowcase } from "./location-collection";
import { LocationPropertyCard } from "./LocationPropertyCard";
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

/**
 * "Homes worth exploring": one lead listing beside up to three supporting ones, taken in
 * order from the newest published properties. A confirmed zero and an unavailable request
 * are separate states, and the layout adapts to one, two, three or four real listings
 * without repeating any. Two listings carry equal weight, so both use the lead card.
 */
export function LocationShowcase({ collection }: { collection: CollectionState }) {
  if (collection.status === "unavailable") {
    return (
      <div className={styles.state} role="status" data-state="unavailable">
        <div className={styles.stateCopy}>
          <p className={styles.stateEyebrow}>Collection unavailable</p>
          <h3>We couldn’t load properties right now.</h3>
          <p>
            The property service did not respond, so this is not a confirmed empty
            collection. No sample homes have been substituted.
          </p>
          <div className={styles.stateActions}>
            <LocationRetry />
            <Link href="/properties" className={`${styles.quietAction} cta`}>
              <RollLabel>Browse all properties</RollLabel>
              <Arrow />
            </Link>
          </div>
        </div>
        <span className={styles.stateArt} aria-hidden="true" />
      </div>
    );
  }

  const showcase = pickShowcase(collection.items);
  if (!showcase) {
    return (
      <div className={styles.state} data-state="empty">
        <div className={styles.stateCopy}>
          <p className={styles.stateEyebrow}>No published homes yet</p>
          <h3>New listings will appear here.</h3>
          <p>
            No properties are published at the moment. Browse the catalog, or tell RC
            Premier what you are looking for.
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
        <span className={styles.stateArt} aria-hidden="true" />
      </div>
    );
  }

  const shown = 1 + showcase.supporting.length;
  return (
    <>
      <div className={styles.showcase} data-count={shown}>
        <LocationPropertyCard
          property={showcase.lead}
          resultsHref="/locations"
          variant="lead"
        />
        {showcase.supporting.length ? (
          <div className={styles.showcaseAside}>
            {showcase.supporting.map((property) => (
              <LocationPropertyCard
                key={property.id}
                property={property}
                resultsHref="/locations"
                variant={shown === 2 ? "lead" : "compact"}
              />
            ))}
          </div>
        ) : null}
      </div>
      {collection.total > shown ? (
        <p className={styles.showcaseNote}>
          Showing the latest {shown} of {collection.total.toLocaleString("en-PH")}{" "}
          published properties.
        </p>
      ) : null}
    </>
  );
}
