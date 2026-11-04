"use client";

import Link from "next/link";
import { PropertyMedia } from "@/features/properties/PropertyMedia";
import type { ViewingProperty } from "./ViewingScheduler";
import styles from "./InquiryForm.module.css";

/**
 * The listing a Contact link came from, shown only with details the public API returned.
 * The internal property ID travels with the form; the visitor never has to read or type it.
 */
export function InquiryPropertyContext({
  property,
  onDrop,
}: {
  property: ViewingProperty;
  onDrop: () => void;
}) {
  return (
    <section className={styles.context} aria-labelledby="inquiry-context-title">
      <span className={styles.contextThumb} aria-hidden="true">
        <PropertyMedia media={property.media} label="" sizes="96px" />
      </span>
      <div className={styles.contextCopy}>
        <p className={styles.contextEyebrow}>Inquiring about</p>
        <h3 id="inquiry-context-title" className={styles.contextTitle}>
          {property.title}
        </h3>
        <p className={styles.contextMeta}>
          <span>#{property.propertyId}</span>
          <span>{property.locationLabel}</span>
          <span>{property.typeLabel}</span>
        </p>
        {property.availability !== "available" ? (
          <p className={styles.contextNote}>
            {property.availability === "sold"
              ? "This listing is marked as sold."
              : "This listing is reserved."}{" "}
            You can still send an inquiry.
          </p>
        ) : null}
      </div>
      <div className={styles.contextActions}>
        <Link href={`/properties/${property.slug}`} className={styles.contextAction}>
          View listing
        </Link>
        <button type="button" className={styles.contextAction} onClick={onDrop}>
          Not about this property
        </button>
      </div>
    </section>
  );
}
