import Link from "next/link";
import type { PropertySort } from "@rc/shared";
import { RollLabel } from "@/components/ui/RollLabel";
import { withCatalogFixture, type CatalogFixtureScenario } from "./catalog-inventory";
import { LinkPending } from "./LinkPending";
import { propertyFilterChips } from "./PropertyFilterChips";
import {
  removePropertyFilterHref,
  sortHref,
  type PropertyFormValues,
  type RawSearchParams,
} from "./property-query";
import styles from "./property-catalog.module.css";

function CtaArrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** Shared dark pill used for the catalog's primary calls to action. */
export function CatalogCta({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: string;
  secondary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`${styles.cta} ${secondary ? styles.ctaSecondary : ""} cta`}
    >
      <RollLabel>{children}</RollLabel>
      <CtaArrow />
    </Link>
  );
}

export function CatalogIntro({
  location,
  count,
}: {
  location?: string;
  count?: number;
}) {
  return (
    <section className={styles.intro} aria-labelledby="properties-heading">
      <div className={styles.container}>
        <div className={styles.introGrid}>
          <div>
            <p className={styles.eyebrow}>Properties</p>
            <h1 id="properties-heading" className={styles.headline}>
              {location
                ? `Properties for sale in ${location}`
                : "Homes worth a closer look."}
            </h1>
          </div>
          <p className={styles.introCopy}>
            {location && count !== undefined
              ? `${count.toLocaleString("en-PH")} published ${count === 1 ? "property is" : "properties are"} currently available to explore in this location.`
              : "Explore available homes and residential opportunities across Pampanga."}
          </p>
        </div>
      </div>
    </section>
  );
}

const SORT_LABELS: Record<PropertySort, string> = {
  newest: "Newest",
  "price-asc": "Price ↑",
  "price-desc": "Price ↓",
};

const SORT_NAMES: Record<PropertySort, string> = {
  newest: "Newest first",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
};

export function CatalogSort({
  current,
  searchParams,
  fixture,
}: {
  current: PropertySort;
  searchParams: RawSearchParams;
  fixture?: CatalogFixtureScenario;
}) {
  return (
    <nav className={styles.sort} aria-label="Sort properties">
      <span aria-hidden="true">Sort</span>
      {(Object.keys(SORT_LABELS) as PropertySort[]).map((sort) => (
        <Link
          key={sort}
          href={withCatalogFixture(sortHref(searchParams, sort), fixture)}
          aria-current={sort === current ? "true" : undefined}
          aria-label={SORT_NAMES[sort]}
          scroll={false}
          replace
        >
          {SORT_LABELS[sort]}
          <LinkPending />
        </Link>
      ))}
    </nav>
  );
}

export function CatalogHeading({ total }: { total?: number }) {
  return (
    <div className={styles.resultsHeading}>
      <h2 id="property-results-title">Available properties</h2>
      {total !== undefined ? (
        <p className={styles.count} aria-live="polite">
          {total.toLocaleString("en-PH")} {total === 1 ? "property" : "properties"}
        </p>
      ) : null}
      <span className={styles.updating} aria-hidden="true">
        Updating…
      </span>
    </div>
  );
}

interface CatalogStateProps {
  kind: "empty" | "unavailable";
  eyebrow: string;
  headline: [string, string];
  body: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
}

/** Centered editorial state shared by zero results and unavailable listings. */
function CatalogState({
  kind,
  eyebrow,
  headline,
  body,
  primary,
  secondary,
}: CatalogStateProps) {
  return (
    <div className={styles.state} data-catalog-state={kind}>
      <p className={`${styles.eyebrow} ${styles.stateEyebrow}`}>{eyebrow}</p>
      <h3>
        {headline[0]} <br />
        {headline[1]}
      </h3>
      <p>{body}</p>
      <div className={styles.stateActions}>
        <CatalogCta href={primary.href}>{primary.label}</CatalogCta>
        <CatalogCta href={secondary.href} secondary>
          {secondary.label}
        </CatalogCta>
      </div>
    </div>
  );
}

/** The request worked; the current filters simply matched nothing. */
export function ZeroResults({ clearHref = "/properties" }: { clearHref?: string }) {
  return (
    <CatalogState
      kind="empty"
      eyebrow="No matches"
      headline={["No homes match", "those filters yet."]}
      body="Try widening your location, price, or property preferences — or tell RC Premier what you’re looking for."
      primary={{ label: "Clear filters", href: clearHref }}
      secondary={{ label: "Contact RC Premier", href: "/contact" }}
    />
  );
}

/** The listings request failed; filters are not the cause. */
export function CatalogUnavailable({ retryHref }: { retryHref: string }) {
  return (
    <CatalogState
      kind="unavailable"
      eyebrow="Listings unavailable"
      headline={["Properties are", "temporarily unavailable."]}
      body="We can’t load the current listings right now, but RC Premier can still help you explore suitable options across Pampanga."
      primary={{ label: "Try again", href: retryHref }}
      secondary={{ label: "Contact RC Premier", href: "/contact" }}
    />
  );
}

export function CatalogSkeleton() {
  return (
    <ul className={styles.grid} data-count="3" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <li key={index}>
          <div className={`${styles.card} ${styles.skeleton}`}>
            <div className={styles.cardMedia} />
            <div className={styles.cardPanel} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Active filters as quiet stone chips; each removes itself, one link clears them all. */
export function CatalogActiveFilters({
  values,
  searchParams,
  fixture,
}: {
  values: PropertyFormValues;
  searchParams: RawSearchParams;
  fixture?: CatalogFixtureScenario;
}) {
  const chips = propertyFilterChips(values);
  if (chips.length === 0) return null;

  return (
    <div className={styles.chips} aria-label="Active property filters">
      <ul>
        {chips.map((chip) => (
          <li key={chip.key}>
            <Link
              href={withCatalogFixture(
                removePropertyFilterHref(searchParams, chip.key),
                fixture,
              )}
              aria-label={`Remove filter: ${chip.label}`}
              scroll={false}
              replace
            >
              {chip.label} <span aria-hidden="true">×</span>
              <LinkPending />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={withCatalogFixture("/properties", fixture)}
        className={styles.clearAll}
      >
        Clear all
        <LinkPending />
      </Link>
    </div>
  );
}
