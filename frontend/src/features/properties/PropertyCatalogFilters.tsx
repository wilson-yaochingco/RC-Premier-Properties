import {
  PROPERTY_AVAILABILITY,
  PROPERTY_TYPE_LABELS,
  type PropertyFacetsResponse,
} from "@rc/shared";
import { Fragment } from "react";
import { Button } from "@/components/ui/Button";
import type { CatalogFixtureScenario } from "./catalog-inventory";
import { CatalogFilterForm } from "./CatalogFilterForm";
import { FilterDisclosure } from "./FilterDisclosure";
import { PriceFilter } from "./PriceFilter";
import type { PropertyFormValues } from "./property-query";
import styles from "./property-catalog.module.css";

const ADVANCED_KEYS = [
  "propertyId",
  "availability",
  "bedrooms",
  "bathrooms",
  "minLotArea",
  "minFloorArea",
] as const;

interface Props {
  values: PropertyFormValues;
  facets?: PropertyFacetsResponse;
  /** Development fixture to keep selected when the form is submitted. */
  fixture?: CatalogFixtureScenario;
}

function Chevron() {
  return (
    <svg className={styles.chevron} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2 4.5 6 8.5l4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function TextField({
  id,
  name,
  label,
  value,
  placeholder,
  type = "text",
  max,
  maxLength,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  placeholder: string;
  type?: "text" | "number";
  max?: number;
  maxLength?: number;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        min={type === "number" ? "0" : undefined}
        max={max}
        maxLength={maxLength}
        step={type === "number" ? "1" : undefined}
        defaultValue={value}
        placeholder={placeholder}
        className={styles.value}
      />
    </div>
  );
}

/** Locations with current inventory (available or reserved), keeping any selected value. */
function locationOptions(facets: PropertyFacetsResponse | undefined, selected: string) {
  const active =
    facets?.activeLocationCounts?.map(({ location }) => location) ??
    facets?.locations ??
    [];
  return selected && !active.includes(selected) ? [selected, ...active] : active;
}

/** Discrete minimums (1+ … 5+); a value already in the URL stays selectable. */
function CountSelect({
  id,
  name,
  label,
  value,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
}) {
  const options = ["1", "2", "3", "4", "5"];
  if (value && !options.includes(value)) options.push(value);
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select id={id} name={name} defaultValue={value} className={styles.value}>
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}+
          </option>
        ))}
      </select>
      <Chevron />
    </div>
  );
}

export function PropertyCatalogFilters({ values, facets, fixture }: Props) {
  const hasAdvanced = ADVANCED_KEYS.some((key) => values[key]);
  // Fields are uncontrolled; re-keying on the applied values keeps them in step with the URL
  // after a soft navigation (Clear all, chips, Back/Forward) while the panel stays open.
  const appliedKey = JSON.stringify(values);

  return (
    <CatalogFilterForm className={styles.filters}>
      <Fragment key={appliedKey}>
        <div className={`${styles.field} ${styles.keyword}`}>
          <label htmlFor="property-keyword" className={styles.label}>
            Search
          </label>
          <input
            id="property-keyword"
            name="keyword"
            defaultValue={values.keyword}
            placeholder="Search homes, developments, or property names"
            maxLength={100}
            autoComplete="off"
            className={styles.value}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="property-location" className={styles.label}>
            Location
          </label>
          <select
            id="property-location"
            name="location"
            defaultValue={values.location}
            className={styles.value}
          >
            <option value="">All Pampanga</option>
            {locationOptions(facets, values.location).map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
          <Chevron />
        </div>

        <div className={styles.field}>
          <label htmlFor="property-type" className={styles.label}>
            Type
          </label>
          <select
            id="property-type"
            name="propertyType"
            defaultValue={values.propertyType}
            className={styles.value}
          >
            <option value="">All types</option>
            {(facets?.propertyTypes ?? []).map((type) => (
              <option key={type} value={type}>
                {PROPERTY_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <Chevron />
        </div>

        <PriceFilter minPrice={values.minPrice} maxPrice={values.maxPrice} />

        <input type="hidden" name="purpose" value="sale" />
        {fixture ? <input type="hidden" name="catalogFixture" value={fixture} /> : null}
        <input type="hidden" name="sort" value={values.sort} />
      </Fragment>

      <FilterDisclosure defaultOpen={hasAdvanced}>
        <Fragment key={appliedKey}>
          <TextField
            id="property-id"
            name="propertyId"
            label="Property ID"
            value={values.propertyId}
            placeholder="25 or #25"
            maxLength={40}
          />
          <div className={styles.field}>
            <label htmlFor="property-availability" className={styles.label}>
              Availability
            </label>
            <select
              id="property-availability"
              name="availability"
              defaultValue={values.availability}
              className={styles.value}
            >
              <option value="">All states</option>
              {PROPERTY_AVAILABILITY.map((availability) => (
                <option key={availability} value={availability}>
                  {availability.replace(/^./, (first) => first.toUpperCase())}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
          <CountSelect
            id="property-bedrooms"
            name="bedrooms"
            label="Min. bedrooms"
            value={values.bedrooms}
          />
          <CountSelect
            id="property-bathrooms"
            name="bathrooms"
            label="Min. bathrooms"
            value={values.bathrooms}
          />
          <TextField
            id="property-lot-area"
            name="minLotArea"
            label="Min. lot area (sqm)"
            type="number"
            value={values.minLotArea}
            placeholder="Any"
          />
          <TextField
            id="property-floor-area"
            name="minFloorArea"
            label="Min. floor area (sqm)"
            type="number"
            value={values.minFloorArea}
            placeholder="Any"
          />
        </Fragment>
      </FilterDisclosure>

      <Button type="submit" variant="primary" className={styles.submit}>
        Search
      </Button>
    </CatalogFilterForm>
  );
}
