import {
  PROPERTY_AVAILABILITY,
  PROPERTY_TYPE_LABELS,
  type PropertyFacetsResponse,
} from "@rc/shared";
import { Button } from "@/components/ui/Button";
import type { PropertyFormValues } from "./property-query";
import styles from "./properties.module.css";

interface PropertySearchFormProps {
  values: PropertyFormValues;
  facets?: PropertyFacetsResponse;
  action?: string;
  clearHref?: string;
  lockedLocation?: string;
}

export function PropertySearchForm({
  values,
  facets,
  action = "/properties",
  clearHref = "/properties",
  lockedLocation,
}: PropertySearchFormProps) {
  const locations = facets?.locations ?? [];
  const propertyTypes = facets?.propertyTypes ?? [];

  return (
    <form
      action={action}
      method="get"
      className={styles.searchForm}
      role="search"
      aria-label="Filter properties for sale"
    >
      <div className={styles.searchToolbar}>
        <div className={`${styles.searchField} ${styles.searchIdentity}`}>
          <label htmlFor="property-id">Property ID</label>
          <input
            id="property-id"
            name="propertyId"
            defaultValue={values.propertyId}
            placeholder="25, #25, or Premier Property 25"
            maxLength={40}
          />
        </div>

        {lockedLocation ? (
          <div className={styles.searchLocationLock}>
            <span>Location</span>
            <strong>{lockedLocation}</strong>
          </div>
        ) : (
          <div className={`${styles.searchField} ${styles.searchLocation}`}>
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
        )}

        <div className={styles.priceFields}>
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
          <span aria-hidden="true">—</span>
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

        <details className={styles.filterPanel}>
          <summary>Filters</summary>
          <div className={styles.filterPanelBody}>
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
                <label htmlFor="property-type">Property type</label>
                <select
                  id="property-type"
                  name="propertyType"
                  defaultValue={values.propertyType}
                >
                  <option value="">All types</option>
                  {propertyTypes.map((type) => (
                    <option key={type} value={type}>
                      {PROPERTY_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.searchField}>
                <label htmlFor="property-availability">Availability</label>
                <select
                  id="property-availability"
                  name="availability"
                  defaultValue={values.availability}
                >
                  <option value="">All states</option>
                  {PROPERTY_AVAILABILITY.map((availability) => (
                    <option key={availability} value={availability}>
                      {availability.replace(/^./, (first) => first.toUpperCase())}
                    </option>
                  ))}
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
            </div>
          </div>
        </details>

        <input type="hidden" name="purpose" value="sale" />
        <Button type="submit" variant="primary" className={styles.searchSubmit}>
          Search
        </Button>
      </div>

      <div className={styles.searchLowerBar}>
        <div className={`${styles.searchField} ${styles.sortField}`}>
          <label htmlFor="property-sort">Sort results</label>
          <select id="property-sort" name="sort" defaultValue={values.sort}>
            <option value="newest">Newest first</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
        <Button href={clearHref} variant="text">
          Clear all
        </Button>
      </div>
    </form>
  );
}
