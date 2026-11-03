import Link from "next/link";
import { RollLabel } from "@/components/ui/RollLabel";
import { Suspense } from "react";
import {
  FeaturedEyebrow,
  FeaturedInventoryState,
  FeaturedGridSkeleton,
} from "./FeaturedInventoryState";
import { FeaturedPropertiesShowcase } from "./FeaturedPropertiesShowcase";
import {
  loadFeaturedInventory,
  parseFeaturedFixtureScenario,
} from "./featured-inventory";
import styles from "./featured-properties.module.css";

type HomeSearchParams = Promise<Record<string, string | string[] | undefined>>;

const HEADING = "Featured homes across Pampanga.";
const LEDE = "A curated look at properties highlighted by RC Premier.";

/**
 * Eyebrow, headline, supporting copy and (ready state only) the "Explore properties"
 * button. On desktop the link shares the headline row; its slot is reserved so nothing
 * shifts when it arrives.
 */
function FeaturedHeader({ viewAll = false }: { viewAll?: boolean }) {
  return (
    <div className={styles.container}>
      <FeaturedEyebrow />
      <div className={styles.header}>
        <h2 id="featured-heading" className={styles.heading}>
          {HEADING}
        </h2>
        <p className={styles.lede}>{LEDE}</p>
        <div className={styles.viewAllSlot}>
          {viewAll ? (
            <Link href="/properties" className={`${styles.viewAll} cta cta--wrap`}>
              <RollLabel>Explore properties</RollLabel>
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
}: {
  searchParams: HomeSearchParams;
}) {
  const fixture = (await searchParams).featuredFixture;
  const inventory = await loadFeaturedInventory(parseFeaturedFixtureScenario(fixture));

  if (inventory.status === "ready") {
    return (
      <>
        <FeaturedHeader viewAll />
        <FeaturedPropertiesShowcase properties={inventory.items} />
      </>
    );
  }
  return <FeaturedInventoryState kind={inventory.status} />;
}

/**
 * The fallback already carries the real heading and copy, so the section reads
 * immediately while the property request streams in.
 */
export function FeaturedPropertiesSection({
  searchParams,
}: {
  searchParams: HomeSearchParams;
}) {
  return (
    <section className={styles.section} aria-labelledby="featured-heading">
      <Suspense
        fallback={
          <>
            <FeaturedHeader />
            <FeaturedGridSkeleton />
          </>
        }
      >
        <FeaturedPropertiesData searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
