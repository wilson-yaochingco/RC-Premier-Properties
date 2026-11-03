import Link from "next/link";
import type { PublicPropertySummary } from "@rc/shared";
import { formatLocation, formatPrice } from "./property-format";
import { resolvePropertyMedia } from "./development-sample-media";
import { PropertyMedia } from "./PropertyMedia";
import styles from "./properties.module.css";

interface PropertyCardProps {
  property: PublicPropertySummary;
  resultsHref?: string;
}

export function BedIcon() {
  return (
    <svg aria-hidden="true" className={styles.specIcon} viewBox="0 0 18 18" fill="none">
      <path
        d="M2.25 14.25V5.25m0 6h13.5m0 3V8.25a2.25 2.25 0 0 0-2.25-2.25H9m-6.75 5.25h13.5m0 0V14.25"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5.25" cy="8.25" r="1.5" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function BathIcon() {
  return (
    <svg aria-hidden="true" className={styles.specIcon} viewBox="0 0 18 18" fill="none">
      <path
        d="M3 8.25h12v3.75a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8.25Zm1.5 6.75v1.5m9-1.5v1.5M5.25 8.25V4.5a1.5 1.5 0 0 1 3 0v.75"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AreaIcon() {
  return (
    <svg aria-hidden="true" className={styles.specIcon} viewBox="0 0 18 18" fill="none">
      <path
        d="M2.25 3.75A1.5 1.5 0 0 1 3.75 2.25h10.5a1.5 1.5 0 0 1 1.5 1.5v10.5a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5V3.75Z"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M2.25 6.75h13.5M6.75 2.25v13.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles.cardArrow}
      viewBox="0 0 18 18"
      fill="none"
    >
      <path
        d="M3.75 9h10.5m-4.5-4.5 4.5 4.5-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PropertyCard({ property, resultsHref }: PropertyCardProps) {
  const media = resolvePropertyMedia(property.coverMedia, property.id);
  const detailHref = `/properties/${property.slug}${resultsHref ? `?from=${encodeURIComponent(resultsHref)}` : ""}`;
  const specs = property.specifications;

  return (
    <article className={styles.card} data-property-card data-property-id={property.id}>
      <Link
        href={detailHref}
        className={styles.cardMediaLink}
        aria-label={`View ${property.title}`}
      >
        <PropertyMedia
          media={media}
          label="PROPERTY IMAGE"
          className={styles.cardMedia}
        />
        <span className={styles.cardPurpose}>FOR SALE</span>
      </Link>

      <div className={styles.cardBody}>
        <p className={styles.cardPrice}>
          {formatPrice(property.price.amount, property.price.currency)}
        </p>

        <h3 className={styles.cardTitle}>
          <Link href={detailHref}>{property.title}</Link>
        </h3>

        <p className={styles.cardLocation}>{formatLocation(property.location)}</p>

        <div className={styles.cardSpecsRow}>
          <div className={styles.cardSpecsList}>
            {specs.bedrooms ? (
              <span className={styles.specItem} title={`${specs.bedrooms} Bedrooms`}>
                <BedIcon />
                <span>{specs.bedrooms}</span>
              </span>
            ) : null}

            {specs.bathrooms ? (
              <span className={styles.specItem} title={`${specs.bathrooms} Bathrooms`}>
                <BathIcon />
                <span>{specs.bathrooms}</span>
              </span>
            ) : null}

            {specs.floorAreaSqm ? (
              <span
                className={styles.specItem}
                title={`${specs.floorAreaSqm} m² Floor Area`}
              >
                <AreaIcon />
                <span>{specs.floorAreaSqm} m²</span>
              </span>
            ) : specs.lotAreaSqm ? (
              <span
                className={styles.specItem}
                title={`${specs.lotAreaSqm} m² Lot Area`}
              >
                <AreaIcon />
                <span>{specs.lotAreaSqm} m²</span>
              </span>
            ) : null}
          </div>

          <Link
            href={detailHref}
            className={styles.cardArrowLink}
            aria-label={`View details for ${property.title}`}
          >
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </article>
  );
}
