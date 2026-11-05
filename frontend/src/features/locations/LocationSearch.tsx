"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { RollLabel } from "@/components/ui/RollLabel";
import {
  BEDROOM_OPTIONS,
  buildSearchHref,
  type SearchOptions,
  type SearchSelection,
} from "./location-search";
import styles from "./locations-index.module.css";

const EMPTY: SearchSelection = {
  location: "",
  propertyType: "",
  budget: "",
  bedrooms: "",
};

function Chevron() {
  return (
    <svg className={styles.selectChevron} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2 4.5 6 8.5l4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * A horizontal search strip that hands the visitor's choices to the real `/properties`
 * catalog. Only chosen filters reach the URL (`location`, `propertyType`, `minPrice` and
 * `maxPrice` from the budget band, `bedrooms` as a minimum), exactly as the catalog's own
 * form serializes them. Without JavaScript the native GET form still submits location,
 * type and bedrooms.
 */
export function LocationSearch({ options }: { options: SearchOptions }) {
  const router = useRouter();
  const id = useId();
  const [selection, setSelection] = useState<SearchSelection>(EMPTY);
  const active = Object.values(selection).some(Boolean);

  function update(key: keyof SearchSelection, value: string) {
    setSelection((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildSearchHref(selection));
  }

  return (
    <form
      className={styles.search}
      action="/properties"
      method="get"
      role="search"
      aria-label="Search properties by location, type and budget"
      onSubmit={onSubmit}
    >
      <div className={styles.searchFields}>
        <div className={styles.searchField}>
          <label htmlFor={`${id}-location`}>Location</label>
          <div className={styles.selectWrap}>
            <select
              id={`${id}-location`}
              name="location"
              value={selection.location}
              onChange={(event) => update("location", event.target.value)}
            >
              <option value="">All of Pampanga</option>
              {options.locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
        </div>

        <div className={styles.searchField}>
          <label htmlFor={`${id}-type`}>Property type</label>
          <div className={styles.selectWrap}>
            <select
              id={`${id}-type`}
              name="propertyType"
              value={selection.propertyType}
              onChange={(event) => update("propertyType", event.target.value)}
            >
              <option value="">Any type</option>
              {options.propertyTypes.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
        </div>

        <div className={styles.searchField}>
          <label htmlFor={`${id}-budget`}>Budget</label>
          <div className={styles.selectWrap}>
            <select
              id={`${id}-budget`}
              value={selection.budget}
              onChange={(event) => update("budget", event.target.value)}
            >
              <option value="">Any budget</option>
              {options.budgets.map(({ id: bandId, label }) => (
                <option key={bandId} value={bandId}>
                  {label}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
        </div>

        <div className={styles.searchField}>
          <label htmlFor={`${id}-bedrooms`}>Bedrooms</label>
          <div className={styles.selectWrap}>
            <select
              id={`${id}-bedrooms`}
              name="bedrooms"
              value={selection.bedrooms}
              onChange={(event) => update("bedrooms", event.target.value)}
            >
              <option value="">Any</option>
              {BEDROOM_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
        </div>
      </div>

      <div className={styles.searchActions}>
        <button type="submit" className={`${styles.searchSubmit} cta`}>
          <RollLabel>Find properties</RollLabel>
          <Arrow />
        </button>
        {active ? (
          <button
            type="button"
            className={styles.searchClear}
            onClick={() => setSelection(EMPTY)}
          >
            Clear selection
          </button>
        ) : null}
      </div>
    </form>
  );
}
