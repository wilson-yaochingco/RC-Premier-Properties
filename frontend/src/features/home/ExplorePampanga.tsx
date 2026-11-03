import Link from "next/link";
import { RollLabel } from "@/components/ui/RollLabel";
import { Suspense, type ReactNode } from "react";
import { ExplorePampangaMap } from "./ExplorePampangaMap";
import {
  loadLocationInventory,
  parseLocationFixtureScenario,
} from "./location-inventory";
import styles from "./explore-pampanga.module.css";

type HomeSearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATE_COPY = {
  empty: {
    heading: "Looking in a particular area?",
    body: "Tell us where you’d like to live and RC Premier can help you explore suitable options across Pampanga.",
  },
  unavailable: {
    heading: "Looking for a particular area?",
    body: "Tell us where you’re searching and RC Premier can help you explore suitable options across Pampanga.",
  },
} as const;

const DEFAULT_HEADING = (
  <>
    <span>Find the area</span> <span>that feels right.</span>
  </>
);

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Copy on the left, one action on the right. The action slot is always reserved so the
 * button arriving with the data never shifts the map.
 */
function ExploreHeader({
  heading,
  body,
  action,
  state,
}: {
  heading: ReactNode;
  body?: string;
  action?: { href: string; label: string };
  state?: "empty" | "unavailable";
}) {
  return (
    <div data-explore-state={state}>
      <p className={styles.eyebrow}>Explore Pampanga</p>
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          <h2 id="explore-pampanga-heading" className={styles.heading}>
            {heading}
          </h2>
          {body ? <p className={styles.stateBody}>{body}</p> : null}
        </div>
        <div className={styles.viewAllSlot}>
          {action ? (
            <Link href={action.href} className={`${styles.button} cta cta--wrap`}>
              <RollLabel>{action.label}</RollLabel>
              <Arrow />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

async function ExplorePampangaData({
  searchParams,
}: {
  searchParams: HomeSearchParams;
}) {
  const fixture = (await searchParams).locationFixture;
  const inventory = await loadLocationInventory(parseLocationFixtureScenario(fixture));

  if (inventory.status === "ready") {
    return (
      <>
        <ExploreHeader
          heading={DEFAULT_HEADING}
          action={{ href: "/locations", label: "Explore all locations" }}
        />
        <ExplorePampangaMap locations={inventory.locations} />
      </>
    );
  }

  const copy = STATE_COPY[inventory.status];
  return (
    <>
      <ExploreHeader
        heading={copy.heading}
        body={copy.body}
        action={{ href: "/contact", label: "Contact RC Premier" }}
        state={inventory.status}
      />
      <ExplorePampangaMap locations={[]} />
    </>
  );
}

/** The real heading is in the fallback, so the request only decides what follows it. */
export function ExplorePampangaSection({
  searchParams,
}: {
  searchParams: HomeSearchParams;
}) {
  return (
    <section className={styles.section} aria-labelledby="explore-pampanga-heading">
      <div className={styles.container}>
        <Suspense
          fallback={
            <>
              <ExploreHeader heading={DEFAULT_HEADING} />
              <ExplorePampangaMap locations={[]} />
            </>
          }
        >
          <ExplorePampangaData searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}
