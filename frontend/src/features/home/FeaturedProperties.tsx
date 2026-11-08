import Link from "next/link";
import { RollLabel } from "@/components/ui/RollLabel";
import { accent } from "@/lib/accent";
import { Suspense } from "react";
import {
  FeaturedEyebrow,
  FeaturedInventoryState,
  FeaturedGridSkeleton,
} from "./FeaturedInventoryState";
import { MotionHydrated } from "@/components/layout/MotionHydrated";
import { FeaturedPropertiesShowcase } from "./FeaturedPropertiesShowcase";
import {
  loadFeaturedInventory,
  parseFeaturedFixtureScenario,
} from "./featured-inventory";
import styles from "./featured-properties.module.css";

type HomeSearchParams = Promise<Record<string, string | string[] | undefined>>;

const HEADING = "Featured *homes* across Pampanga.";
const LEDE = "A curated look at properties highlighted by RC Premier.";
type FeaturedVariant = "home" | "locations";
const sectionId = (variant: FeaturedVariant) =>
  variant === "locations" ? "collection-title" : "featured-heading";

/**
 * Eyebrow, headline, supporting copy and (ready state only) the "Explore properties"
 * button. On desktop the link shares the headline row; its slot is reserved so nothing
 * shifts when it arrives.
 */
function FeaturedHeader({
  viewAll = false,
  variant = "home",
}: {
  viewAll?: boolean;
  variant?: FeaturedVariant;
}) {
  const locations = variant === "locations";
  return (
    <div className={styles.container}>
      {locations ? null : <FeaturedEyebrow />}
      <div className={styles.header} data-motion="sequence">
        <h2
          id={sectionId(variant)}
          className={styles.heading}
          data-motion-step="heading"
        >
          {accent(locations ? "Homes worth *exploring*" : HEADING)}
        </h2>
        <p className={styles.lede} data-motion-step="fade" data-motion-at="0.3">
          {locations
            ? "Discover currently published properties across Pampanga."
            : LEDE}
        </p>
        <div
          className={styles.viewAllSlot}
          data-motion-step="fade"
          data-motion-at="0.45"
        >
          {viewAll || locations ? (
            <Link href="/properties" className={`${styles.viewAll} cta cta--wrap`}>
              <RollLabel>
                {locations ? "Browse all properties" : "Explore properties"}
              </RollLabel>
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

async function FeaturedPropertiesData({
  searchParams,
  variant,
}: {
  searchParams: HomeSearchParams;
  variant: FeaturedVariant;
}) {
  const query = await searchParams;
  const legacy = Array.isArray(query.locationsFixture)
    ? query.locationsFixture[0]
    : query.locationsFixture;
  const previews: Record<string, string> = {
    "0": "empty",
    "1": "one",
    "2": "two",
    "4": "three",
    many: "three",
    unavailable: "unavailable",
  };
  const fixture =
    query.featuredFixture ??
    (variant === "locations" && legacy ? previews[legacy] : undefined);
  const gate = variant === "locations" ? "locations-featured" : "featured";
  const inventory = await loadFeaturedInventory(parseFeaturedFixtureScenario(fixture));

  if (inventory.status === "ready") {
    return (
      <>
        <MotionHydrated gate={gate} />
        <FeaturedHeader viewAll variant={variant} />
        <FeaturedPropertiesShowcase
          properties={
            variant === "locations" ? inventory.items.slice(0, 3) : inventory.items
          }
        />
      </>
    );
  }
  return (
    <>
      <MotionHydrated gate={gate} />
      {variant === "locations" ? <FeaturedHeader variant={variant} /> : null}
      <FeaturedInventoryState
        kind={inventory.status}
        compact={variant === "locations"}
      />
    </>
  );
}

/**
 * The fallback already carries the real heading and copy, so the section reads
 * immediately while the property request streams in.
 */
export function FeaturedPropertiesSection({
  searchParams,
  variant = "home",
}: {
  searchParams: HomeSearchParams;
  variant?: FeaturedVariant;
}) {
  return (
    <section
      className={
        variant === "locations"
          ? `${styles.section} ${styles.locations}`
          : styles.section
      }
      aria-labelledby={sectionId(variant)}
      data-motion-gate={variant === "locations" ? "locations-featured" : "featured"}
    >
      <Suspense
        fallback={
          <>
            <FeaturedHeader variant={variant} />
            <FeaturedGridSkeleton />
          </>
        }
      >
        <FeaturedPropertiesData searchParams={searchParams} variant={variant} />
      </Suspense>
    </section>
  );
}
