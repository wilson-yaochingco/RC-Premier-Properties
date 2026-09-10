import Link from "next/link";
import { PROPERTY_TYPE_LABELS } from "@rc/shared";
import { formatPrice } from "./property-format";
import {
  removePropertyFilterHref,
  type PropertyFormValues,
  type RawSearchParams,
} from "./property-query";
import styles from "./properties.module.css";

interface FilterChip {
  key: keyof PropertyFormValues;
  label: string;
}

function validNumber(value: string): number | undefined {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function propertyFilterChips(values: PropertyFormValues): FilterChip[] {
  const chips: FilterChip[] = [];
  if (values.propertyId)
    chips.push({ key: "propertyId", label: `Property #${values.propertyId}` });
  if (values.location) chips.push({ key: "location", label: values.location });
  if (values.propertyType) {
    chips.push({
      key: "propertyType",
      label: PROPERTY_TYPE_LABELS[values.propertyType],
    });
  }
  if (values.availability) {
    chips.push({
      key: "availability",
      label: values.availability.replace(/^./, (first) => first.toUpperCase()),
    });
  }
  if (values.keyword)
    chips.push({ key: "keyword", label: `Keyword: ${values.keyword}` });

  for (const [key, prefix] of [
    ["minPrice", "From"],
    ["maxPrice", "Up to"],
  ] as const) {
    const amount = validNumber(values[key]);
    if (amount !== undefined)
      chips.push({ key, label: `${prefix} ${formatPrice(amount)}` });
  }
  for (const [key, label] of [
    ["bedrooms", "bedrooms"],
    ["bathrooms", "bathrooms"],
    ["minLotArea", "sqm lot"],
    ["minFloorArea", "sqm floor"],
  ] as const) {
    const amount = validNumber(values[key]);
    if (amount !== undefined) chips.push({ key, label: `${amount}+ ${label}` });
  }
  if (values.sort !== "newest") {
    chips.push({
      key: "sort",
      label: values.sort === "price-asc" ? "Price: low to high" : "Price: high to low",
    });
  }
  return chips;
}

export function PropertyFilterChips({
  values,
  searchParams,
  basePath = "/properties",
  clearHref = "/properties",
  omitLocation = false,
}: {
  values: PropertyFormValues;
  searchParams: RawSearchParams;
  basePath?: string;
  clearHref?: string;
  omitLocation?: boolean;
}) {
  const chips = propertyFilterChips(values);
  if (chips.length === 0) return null;

  return (
    <div className={styles.activeFilters} aria-label="Active property filters">
      <span>Active filters</span>
      <ul>
        {chips.map((chip) => (
          <li key={chip.key}>
            <Link
              href={removePropertyFilterHref(
                searchParams,
                chip.key,
                basePath,
                omitLocation,
              )}
              aria-label={`Remove filter: ${chip.label}`}
            >
              {chip.label} <span aria-hidden="true">×</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href={clearHref} className={styles.clearFilters}>
        Clear all
      </Link>
    </div>
  );
}
