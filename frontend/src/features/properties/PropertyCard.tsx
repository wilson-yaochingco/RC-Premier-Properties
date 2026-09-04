import Link from "next/link";
import type { PublicPropertySummary } from "@rc/shared";
import {
  formatLocation,
  formatPrice,
  propertyTypeLabel,
  visibleSpecifications,
} from "./property-format";
import { PropertyMedia } from "./PropertyMedia";
import styles from "./properties.module.css";

interface PropertyCardProps {
  property: PublicPropertySummary;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const specifications = visibleSpecifications(property.specifications).slice(0, 3);

  return (
    <article className={styles.card} data-property-card data-property-id={property.id}>
      <Link
        href={`/properties/${property.slug}`}
        className={styles.cardMediaLink}
        aria-label={`View ${property.title}`}
      >
        <PropertyMedia
          media={property.coverMedia}
          label="PROPERTY IMAGE"
          className={styles.cardMedia}
        />
        <span className={styles.cardPurpose}>
          For {property.purpose === "sale" ? "sale" : "rent"}
        </span>
      </Link>

      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <span>{propertyTypeLabel(property.propertyType)}</span>
          <span>ID {property.propertyId}</span>
        </div>
        <p className={styles.cardLocation}>{formatLocation(property.location)}</p>
        <h3 className={styles.cardTitle}>
          <Link href={`/properties/${property.slug}`}>{property.title}</Link>
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
          <span className={styles.availability}>{property.availability}</span>
          <Link href={`/properties/${property.slug}`} className={styles.cardLink}>
            View property <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
