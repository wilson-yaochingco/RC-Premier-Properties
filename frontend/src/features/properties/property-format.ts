import {
  PROPERTY_TYPE_LABELS,
  type PublicPropertyLocation,
  type PublicPropertySpecifications,
  type PropertyCurrency,
  type PropertyType,
} from "@rc/shared";

export function formatPrice(
  amount: number,
  currency: PropertyCurrency = "PHP",
): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatLocation(location: PublicPropertyLocation): string {
  return [location.development, location.barangay, location.city, location.province]
    .filter((part): part is string => Boolean(part))
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join(", ");
}

export function propertyTypeLabel(type: PropertyType): string {
  return PROPERTY_TYPE_LABELS[type];
}

export interface SpecificationLabel {
  label: string;
  value: string;
}

export function visibleSpecifications(
  specifications: PublicPropertySpecifications,
): SpecificationLabel[] {
  const items: Array<SpecificationLabel | undefined> = [
    specifications.bedrooms === undefined
      ? undefined
      : { label: "Bedrooms", value: String(specifications.bedrooms) },
    specifications.bathrooms === undefined
      ? undefined
      : { label: "Bathrooms", value: String(specifications.bathrooms) },
    specifications.parkingSpaces === undefined
      ? undefined
      : { label: "Parking", value: String(specifications.parkingSpaces) },
    specifications.floorAreaSqm === undefined
      ? undefined
      : {
          label: "Floor area",
          value: `${specifications.floorAreaSqm.toLocaleString("en-PH")} sqm`,
        },
    specifications.lotAreaSqm === undefined
      ? undefined
      : {
          label: "Lot area",
          value: `${specifications.lotAreaSqm.toLocaleString("en-PH")} sqm`,
        },
  ];

  return items.filter((item): item is SpecificationLabel => item !== undefined);
}
