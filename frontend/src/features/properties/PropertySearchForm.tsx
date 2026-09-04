import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPES,
  type PropertyFacetsResponse,
} from "@rc/shared";
import { Button } from "@/components/ui/Button";
import type { PropertyFormValues } from "./property-query";
import styles from "./properties.module.css";

interface PropertySearchFormProps {
  values: PropertyFormValues;
  facets?: PropertyFacetsResponse;
}

const LOCATION_SUGGESTIONS = [
  "Angeles City",
  "Mabalacat City",
  "City of San Fernando",
  "Clark Freeport area",
];

export function PropertySearchForm({ values, facets }: PropertySearchFormProps) {
  const locations = Array.from(
    new Set([...LOCATION_SUGGESTIONS, ...(facets?.locations ?? [])]),
  ).sort((left, right) => left.localeCompare(right));

  return (
    <form action="/properties" method="get" className={styles.searchForm}>
      <div className={styles.searchMainFields}>
        <div className={styles.searchField}>
          <label htmlFor="property-id">Property ID</label>
          <input
            id="property-id"
            name="propertyId"
            defaultValue={values.propertyId}
            placeholder="e.g. RCPP-001"
            maxLength={40}
          />
        </div>

        <div className={styles.searchField}>
          <label htmlFor="property-location">Location</label>
          <input
            id="property-location"
            name="location"
            defaultValue={values.location}
            placeholder="All Pampanga locations"
            list="property-location-options"
            maxLength={100}
          />
          <datalist id="property-location-options">
            {locations.map((location) => (
              <option key={location} value={location} />
            ))}
          </datalist>
        </div>

        <div className={styles.searchField}>
          <label htmlFor="property-type">Property type</label>
          <select
            id="property-type"
            name="propertyType"
            defaultValue={values.propertyType}
          >
            <option value="">All types</option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {PROPERTY_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.searchField}>
          <label htmlFor="minimum-price">Minimum price</label>
          <input
            id="minimum-price"
            name="minPrice"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            defaultValue={values.minPrice}
            placeholder="No minimum"
          />
        </div>

        <div className={styles.searchField}>
          <label htmlFor="maximum-price">Maximum price</label>
          <input
            id="maximum-price"
            name="maxPrice"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            defaultValue={values.maxPrice}
            placeholder="No maximum"
          />
        </div>
      </div>

      <div className={styles.searchActions}>
        <details className={styles.advancedFilters}>
          <summary>More filters</summary>
          <div className={styles.advancedGrid}>
            <div className={styles.searchField}>
              <label htmlFor="property-keyword">Keyword</label>
              <input
                id="property-keyword"
                name="keyword"
                defaultValue={values.keyword}
                placeholder="Title or area"
                maxLength={100}
              />
            </div>

            <div className={styles.searchField}>
              <label htmlFor="property-purpose">Listing purpose</label>
              <select
                id="property-purpose"
                name="purpose"
                defaultValue={values.purpose}
              >
                <option value="">Sale and rent</option>
                <option value="sale">For sale</option>
                <option value="rent">For rent</option>
              </select>
            </div>

            <div className={styles.searchField}>
              <label htmlFor="property-bedrooms">Minimum bedrooms</label>
              <input
                id="property-bedrooms"
                name="bedrooms"
                type="number"
                inputMode="numeric"
                min="0"
                max="30"
                defaultValue={values.bedrooms}
                placeholder="Any"
              />
            </div>

            <div className={styles.searchField}>
              <label htmlFor="property-bathrooms">Minimum bathrooms</label>
              <input
                id="property-bathrooms"
                name="bathrooms"
                type="number"
                inputMode="numeric"
                min="0"
                max="30"
                defaultValue={values.bathrooms}
                placeholder="Any"
              />
            </div>

            <div className={styles.searchField}>
              <label htmlFor="property-lot-area">Minimum lot area</label>
              <input
                id="property-lot-area"
                name="minLotArea"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                defaultValue={values.minLotArea}
                placeholder="sqm"
              />
            </div>

            <div className={styles.searchField}>
              <label htmlFor="property-floor-area">Minimum floor area</label>
              <input
                id="property-floor-area"
                name="minFloorArea"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                defaultValue={values.minFloorArea}
                placeholder="sqm"
              />
            </div>

            <div className={styles.searchField}>
              <label htmlFor="property-sort">Sort results</label>
              <select id="property-sort" name="sort" defaultValue={values.sort}>
                <option value="newest">Newest first</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </div>
          </div>
        </details>

        <div className={styles.searchButtons}>
          <Button href="/properties" variant="text">
            Clear
          </Button>
          <Button type="submit" variant="secondary">
            Search properties
          </Button>
        </div>
      </div>
    </form>
  );
}
