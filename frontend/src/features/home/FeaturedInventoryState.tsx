import Link from "next/link";
import { RollLabel } from "@/components/ui/RollLabel";
import styles from "./featured-properties.module.css";

function CtaArrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function FeaturedEyebrow() {
  return <p className={styles.eyebrow}>Featured properties</p>;
}

/** Route empty and unavailable inventory states to the same contact action. */
const COPY = {
  empty: {
    heading: "Nothing featured right now.",
    body: "Looking for something specific? Tell us what you have in mind and we’ll help you explore suitable properties across Pampanga.",
  },
  unavailable: {
    heading: "Looking for a property?",
    body: "Our featured selection can’t be shown right now, but RC Premier can still help you explore suitable options across Pampanga.",
  },
} as const;

/**
 * Zero-inventory and API-unavailable states. One compact, left-aligned content block that
 * reads as intentional homepage content, never as an error panel.
 */
export function FeaturedInventoryState({ kind }: { kind: "empty" | "unavailable" }) {
  const copy = COPY[kind];

  return (
    <div className={styles.container} data-featured-state={kind}>
      <FeaturedEyebrow />
      <h2 id="featured-heading" className={styles.heading}>
        {copy.heading}
      </h2>
      <p className={`${styles.lede} ${styles.stateBody}`}>{copy.body}</p>
      <div className={styles.stateActions}>
        <Link href="/contact" className={`${styles.statePrimary} cta`}>
          <RollLabel>Contact RC Premier</RollLabel>
          <CtaArrow />
        </Link>
      </div>
    </div>
  );
}

/** Same card/media/panel dimensions as the real cards so streaming causes no layout shift. */
export function FeaturedGridSkeleton() {
  return (
    <div className={styles.container}>
      <p role="status" className="visually-hidden">
        Loading featured properties
      </p>
      <ul className={styles.grid} data-count="3" aria-hidden="true" role="presentation">
        {[0, 1, 2].map((index) => (
          <li key={index}>
            <div className={`${styles.card} ${styles.skeletonCard}`}>
              <div className={styles.cardMedia} />
              <div className={styles.cardPanel} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
