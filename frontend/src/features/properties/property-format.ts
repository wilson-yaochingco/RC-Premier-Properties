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
      : { label: "Parking Space", value: String(specifications.parkingSpaces) },
    specifications.powderRooms === undefined
      ? undefined
      : { label: "Powder Room", value: String(specifications.powderRooms) },
    specifications.storeys === undefined
      ? undefined
      : { label: "Floor/Level", value: String(specifications.storeys) },
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

export type KeyFactKind =
  "bedrooms" | "bathrooms" | "parking" | "floorArea" | "lotArea";

export interface KeyFact {
  kind: KeyFactKind;
  value: string;
  label: string;
}

function counted(value: number, singular: string, plural = `${singular}s`) {
  return { value: String(value), label: value === 1 ? singular : plural };
}

/** The headline facts shown beside the title; an unsupplied value simply has no entry. */
export function keyFacts(specifications: PublicPropertySpecifications): KeyFact[] {
  const { bedrooms, bathrooms, parkingSpaces, floorAreaSqm, lotAreaSqm } =
    specifications;
  const area = (value: number) => `${value.toLocaleString("en-PH")} sqm`;
  const facts: Array<KeyFact | undefined> = [
    bedrooms === undefined
      ? undefined
      : { kind: "bedrooms", ...counted(bedrooms, "Bedroom") },
    bathrooms === undefined
      ? undefined
      : { kind: "bathrooms", ...counted(bathrooms, "Bathroom") },
    parkingSpaces === undefined
      ? undefined
      : { kind: "parking", ...counted(parkingSpaces, "Parking space") },
    floorAreaSqm === undefined
      ? undefined
      : { kind: "floorArea", value: area(floorAreaSqm), label: "Floor area" },
    lotAreaSqm === undefined
      ? undefined
      : { kind: "lotArea", value: area(lotAreaSqm), label: "Lot area" },
  ];
  return facts.filter((fact): fact is KeyFact => fact !== undefined);
}
