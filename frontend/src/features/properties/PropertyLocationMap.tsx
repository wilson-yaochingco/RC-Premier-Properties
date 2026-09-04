"use client";

import { useRouter } from "next/navigation";
import type { PublicPropertySummary } from "@rc/shared";
import { PropertyMap } from "./PropertyMap";

interface PropertyLocationMapProps {
  property: PublicPropertySummary;
}

export function PropertyLocationMap({ property }: PropertyLocationMapProps) {
  const router = useRouter();

  return (
    <PropertyMap
      properties={[property]}
      selectedRegion={property.location.city}
      forceLoad={false}
      onPropertyActivate={() => undefined}
      onRegionSelect={(region) =>
        router.push(`/properties?location=${encodeURIComponent(region)}`)
      }
    />
  );
}
