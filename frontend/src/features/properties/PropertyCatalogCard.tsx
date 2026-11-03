import Link from "next/link";
import type { PublicPropertySummary } from "@rc/shared";
import { resolvePropertyMedia } from "./development-sample-media";
import { AreaIcon, BathIcon, BedIcon } from "./PropertyCard";
import { formatLocation, formatPrice, propertyTypeLabel } from "./property-format";
import { PropertyMedia } from "./PropertyMedia";
import styles from "./property-catalog.module.css";

const CARD_SIZES = "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw";

interface PropertyCatalogCardProps {
  property: PublicPropertySummary;
  resultsHref?: string;
  priority?: boolean;
}

export function PropertyCatalogCard({
  property,
  resultsHref,
  priority = false,
}: PropertyCatalogCardProps) {
  const media = resolvePropertyMedia(property.coverMedia, property.id);
  const { specifications: specs } = property;
  const detailHref = `/properties/${property.slug}${resultsHref ? `?from=${encodeURIComponent(resultsHref)}` : ""}`;
  const area = specs.floorAreaSqm
    ? { value: specs.floorAreaSqm, label: "Floor Area" }
    : specs.lotAreaSqm
      ? { value: specs.lotAreaSqm, label: "Lot Area" }
      : undefined;

  return (
    <article data-property-card data-property-id={property.id} className={styles.card}>
      <Link
        href={detailHref}
        className={styles.cardLink}
        aria-label={`View ${property.title}`}
      >
        <div className={styles.cardMedia}>
          <PropertyMedia
            media={media}
            label="PROPERTY IMAGE"
            className={styles.cardImage}
            sizes={CARD_SIZES}
            preload={priority}
          />
          {property.availability !== "available" ? (
            <span className={styles.status}>{property.availability}</span>
          ) : null}
        </div>

        <div className={styles.cardPanel}>
          <div className={styles.cardMeta}>
            <p className={styles.type}>{propertyTypeLabel(property.propertyType)}</p>
            <p className={styles.price}>
              {formatPrice(property.price.amount, property.price.currency)}
            </p>
            <h3 className={styles.title}>{property.title}</h3>
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

            <span className={styles.cardCta} aria-hidden="true">
              View property
              <svg viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
