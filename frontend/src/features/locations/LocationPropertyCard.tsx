import Link from "next/link";
import type { PublicPropertySummary } from "@rc/shared";
import { AreaIcon, BathIcon, BedIcon } from "../properties/PropertyCard";
import {
  formatLocation,
  formatPrice,
  propertyTypeLabel,
} from "../properties/property-format";
import { hasRenderableImage } from "../properties/property-media-support";
import { PropertyMedia } from "../properties/PropertyMedia";
import styles from "./locations-index.module.css";

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * A real property card for the "Homes worth exploring" showcase. `lead` is the large
 * featured card and `compact` the supporting one. Both link to the property's detail page
 * and show only API data. A listing with no renderable photograph gets an intentional
 * no-image composition (a typographic plate for the lead, a text-led card when compact)
 * instead of an empty image slot; no development sample photography is substituted.
 */
export function LocationPropertyCard({
  property,
  resultsHref,
  variant,
  priority = false,
}: {
  property: PublicPropertySummary;
  resultsHref: string;
  variant: "lead" | "compact";
  priority?: boolean;
}) {
  const hasImage = hasRenderableImage(property.coverMedia);
  const { specifications: specs } = property;
  const area = specs.floorAreaSqm
    ? { value: specs.floorAreaSqm, label: "Floor Area" }
    : specs.lotAreaSqm
      ? { value: specs.lotAreaSqm, label: "Lot Area" }
      : undefined;
  const lead = variant === "lead";

  return (
    <article
      data-property-card
      data-property-id={property.id}
      data-variant={variant}
      data-media={hasImage ? "image" : "none"}
      className={styles.propCard}
    >
      <Link
        href={`/properties/${property.slug}?from=${encodeURIComponent(resultsHref)}`}
        className={`${styles.propLink} cta`}
        aria-label={`View ${property.title}`}
      >
        {hasImage ? (
          <span className={styles.propMedia}>
            <PropertyMedia
              media={property.coverMedia}
              label="PROPERTY IMAGE"
              sizes={
                lead
                  ? "(max-width: 63.99rem) 100vw, 52vw"
                  : "(max-width: 63.99rem) 50vw, 20vw"
              }
              preload={priority}
            />
          </span>
        ) : lead ? (
          <span className={styles.plate} aria-hidden="true">
            <span className={styles.plateMark}>
              {propertyTypeLabel(property.propertyType)}
            </span>
            <span className={styles.plateName}>{property.location.city}</span>
          </span>
        ) : null}

        <span className={styles.propBody}>
          <span className={styles.propType}>
            {propertyTypeLabel(property.propertyType)}
            {property.availability !== "available" ? (
              <span className={styles.propTag}>{property.availability}</span>
            ) : null}
          </span>
          <span className={styles.propPrice}>
            {formatPrice(property.price.amount, property.price.currency)}
          </span>
          <span className={styles.propTitle}>{property.title}</span>
          <span className={styles.propLocation}>
            {formatLocation(property.location)}
          </span>
          <span className={styles.propFoot}>
            <span className={styles.propSpecs}>
              {specs.bedrooms ? (
                <span title={`${specs.bedrooms} Bedrooms`}>
                  <BedIcon />
                  {specs.bedrooms}
                </span>
              ) : null}
              {specs.bathrooms ? (
                <span title={`${specs.bathrooms} Bathrooms`}>
                  <BathIcon />
                  {specs.bathrooms}
                </span>
              ) : null}
              {area ? (
                <span title={`${area.value} m² ${area.label}`}>
                  <AreaIcon />
                  {area.value} m²
                </span>
              ) : null}
            </span>
            <span className={styles.propAction} aria-hidden="true">
              View property
              <Arrow />
            </span>
          </span>
        </span>
      </Link>
    </article>
  );
}
