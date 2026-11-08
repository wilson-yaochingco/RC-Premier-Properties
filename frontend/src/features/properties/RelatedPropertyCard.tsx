import Link from "next/link";
import type { PublicPropertySummary } from "@rc/shared";
import { RoutePending } from "@/components/ui/RoutePending";
import { resolvePropertyMedia } from "./development-sample-media";
import { BathIcon, BedIcon, FloorAreaIcon } from "./PropertyIcons";
import { PropertyMedia } from "./PropertyMedia";
import { formatLocation, formatPrice } from "./property-format";
import styles from "./property-detail.module.css";

/** An image-first card: photograph, title, place and price, with the headline facts. */
export function RelatedPropertyCard({ property }: { property: PublicPropertySummary }) {
  const { bedrooms, bathrooms, floorAreaSqm } = property.specifications;
  const href = `/properties/${property.slug}`;

  return (
    <article className={styles.relatedCard} data-property-card>
      <div className={styles.relatedMedia}>
        <PropertyMedia
          media={resolvePropertyMedia(property.coverMedia, property.id)}
          sizes="(min-width: 64rem) 28vw, (min-width: 48rem) 30vw, 92vw"
        />
      </div>
      <div className={styles.relatedBody}>
        <h3 className={styles.relatedTitle}>
          <Link href={href}>
            {property.title}
            <RoutePending />
          </Link>
        </h3>
        <p className={styles.relatedLocation}>{formatLocation(property.location)}</p>
        <div className={styles.relatedMeta}>
          <p className={styles.relatedPrice}>
            {formatPrice(property.price.amount, property.price.currency)}
          </p>
          <ul className={styles.relatedFacts} aria-label="Key facts">
            {bedrooms !== undefined ? (
              <li>
                <BedIcon />
                {bedrooms} bd
              </li>
            ) : null}
            {bathrooms !== undefined ? (
              <li>
                <BathIcon />
                {bathrooms} ba
              </li>
            ) : null}
            {floorAreaSqm !== undefined ? (
              <li>
                <FloorAreaIcon />
                {floorAreaSqm.toLocaleString("en-PH")} sqm
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </article>
  );
}
