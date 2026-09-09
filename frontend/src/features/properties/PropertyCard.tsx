import Link from "next/link";
import type { PublicPropertySummary } from "@rc/shared";
import {
  formatLocation,
  formatPrice,
  propertyTypeLabel,
  visibleSpecifications,
} from "./property-format";
import { resolvePropertyMedia } from "./development-sample-media";
import { PropertyMedia } from "./PropertyMedia";
import styles from "./properties.module.css";

interface PropertyCardProps {
  property: PublicPropertySummary;
  resultsHref?: string;
}

export function PropertyCard({ property, resultsHref }: PropertyCardProps) {
  const specifications = visibleSpecifications(property.specifications).slice(0, 3);
  const media = resolvePropertyMedia(property.coverMedia, property.id);

  const detailHref = `/properties/${property.slug}${resultsHref ? `?from=${encodeURIComponent(resultsHref)}` : ""}`;

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
        <span className={styles.cardPurpose}>For sale</span>
      </Link>

      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <span>{propertyTypeLabel(property.propertyType)}</span>
          <span>Premier Property #{property.propertyId}</span>
        </div>
        <p className={styles.cardLocation}>{formatLocation(property.location)}</p>
        <h3 className={styles.cardTitle}>
          <Link href={detailHref}>{property.title}</Link>
        </h3>
        <p className={styles.cardPrice}>
          {formatPrice(property.price.amount, property.price.currency)}
          {property.price.negotiable ? <small> · negotiable</small> : null}
        </p>

        {specifications.length > 0 ? (
          <dl className={styles.cardSpecs}>
            {specifications.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className={styles.cardFooter}>
          <span className={styles.availability}>
            {property.availability.replace(/^./, (first) => first.toUpperCase())}
          </span>
          <Link href={detailHref} className={styles.cardLink}>
            View property <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
