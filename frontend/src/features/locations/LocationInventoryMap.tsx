"use client";

import { useRouter } from "next/navigation";
import type { PublicPropertySummary } from "@rc/shared";
import { publicLocationPath } from "@/lib/public-location";
import { PropertyMap } from "@/features/properties/PropertyMap";

export function LocationInventoryMap({
  properties,
  location,
}: {
  properties: PublicPropertySummary[];
  location: string;
}) {
  const router = useRouter();

  return (
    <PropertyMap
      properties={properties}
      selectedRegion={location}
      forceLoad={false}
      variant="location"
      onPropertyActivate={() => undefined}
      onRegionSelect={(region) => router.push(publicLocationPath(region))}
    />
  );
}
