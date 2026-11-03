import Link from "next/link";
import type { PublicPropertySummary } from "@rc/shared";
import { resolvePropertyMedia } from "../properties/development-sample-media";
import { AreaIcon, BathIcon, BedIcon } from "../properties/PropertyCard";
import { formatLocation, formatPrice } from "../properties/property-format";
import { PropertyMedia } from "../properties/PropertyMedia";
import styles from "./featured-properties.module.css";

const CARD_SIZES = "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw";

export function FeaturedPropertyCard({
  property,
}: {
  property: PublicPropertySummary;
}) {
  const media = resolvePropertyMedia(property.coverMedia, property.id);
  const { specifications: specs } = property;
  const titleId = `featured-title-${property.id}`;
  const metaId = `featured-meta-${property.id}`;
  const area = specs.floorAreaSqm
    ? { value: specs.floorAreaSqm, label: "Floor Area" }
    : specs.lotAreaSqm
      ? { value: specs.lotAreaSqm, label: "Lot Area" }
      : undefined;

  return (
    <Link
      href={`/properties/${property.slug}`}
      className={styles.card}
      data-featured-property-card
      data-property-id={property.id}
      aria-labelledby={titleId}
      aria-describedby={metaId}
    >
      <div className={styles.cardMedia}>
        <PropertyMedia
          media={media}
          label="PROPERTY IMAGE"
          className={styles.cardImage}
          sizes={CARD_SIZES}
        />
        {property.availability === "reserved" ? (
          <span className={styles.reserved}>Reserved</span>
        ) : null}
      </div>

      <div className={styles.cardPanel}>
        <div id={metaId} className={styles.cardMeta}>
          <p className={styles.price}>
            {formatPrice(property.price.amount, property.price.currency)}
          </p>
          <h3 id={titleId} className={styles.title}>
            {property.title}
          </h3>
          <p className={styles.location}>{formatLocation(property.location)}</p>
        </div>

        <div className={styles.cardFooter}>
          <div className={styles.specs}>
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
          </div>

          <span className={styles.cta} aria-hidden="true">
            View Property
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
