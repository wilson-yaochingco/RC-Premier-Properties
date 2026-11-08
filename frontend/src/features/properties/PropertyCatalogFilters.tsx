import { FEATURED_LOCATIONS } from "@/features/locations/featured-locations";
import type { CatalogFixtureScenario } from "./catalog-inventory";
import type { PropertyFormValues } from "./property-query";
import { PropertySearchFilters } from "./PropertySearchFilters";

export function PropertyCatalogFilters({
  values,
  fixture,
}: {
  values: PropertyFormValues;
  fixture?: CatalogFixtureScenario;
}) {
  return (
    <PropertySearchFilters
      key={JSON.stringify(values)}
      values={values}
      fixture={fixture}
      locations={FEATURED_LOCATIONS.map(({ name }) => name)}
    />
  );
}
