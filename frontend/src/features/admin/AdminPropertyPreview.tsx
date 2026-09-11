"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminPropertyDetail } from "@rc/shared";
import {
  formatPrice,
  propertyTypeLabel,
  visibleSpecifications,
} from "@/features/properties/property-format";
import { ApiClientError } from "@/services/api-client";
import { PropertyGallery } from "@/features/properties/PropertyGallery";
import { getAdminProperty } from "./admin.service";
import { useAdminSession } from "./AdminShell";
import styles from "./admin.module.css";

type PreviewState =
  | { kind: "loading" }
  | { kind: "ready"; property: AdminPropertyDetail }
  | { kind: "error"; message: string };

export function AdminPropertyPreview({ propertyId }: { propertyId: string }) {
  const { expireSession } = useAdminSession();
  const [state, setState] = useState<PreviewState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    getAdminProperty(propertyId, controller.signal)
      .then((property) => setState({ kind: "ready", property }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiClientError && error.statusCode === 401) {
          expireSession();
          return;
        }
        setState({
          kind: "error",
          message:
            error instanceof ApiClientError
              ? error.message
              : "The property preview could not be loaded.",
        });
      });
    return () => controller.abort();
  }, [expireSession, propertyId]);

  if (state.kind === "loading") {
    return (
      <div className={styles.panel} aria-busy="true">
        Loading preview…
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className={styles.panel} role="alert">
        {state.message}
      </div>
    );
  }

  const { property } = state;
  const revealsBarangay = property.location.publicPrecision !== "city-only";
  const revealsDevelopment = ["exact", "approximate", "subdivision"].includes(
    property.location.publicPrecision,
  );
  const location = [
    revealsDevelopment ? property.location.development : undefined,
    revealsBarangay ? property.location.barangay : undefined,
    property.location.city,
    property.location.province,
  ]
    .filter(Boolean)
    .join(", ");
  const specifications = visibleSpecifications(property.specifications);

  return (
    <section className={styles.page} aria-labelledby="preview-title">
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Private property preview</p>
          <h1 id="preview-title">{property.title}</h1>
          <p>This protected preview is not a public listing and is never indexed.</p>
        </div>
        <div className={styles.headerActions}>
          {["draft", "unpublished"].includes(property.publicationStatus) ? (
            <Link href={`/admin/properties/${property.id}/edit`}>Edit content</Link>
          ) : null}
          <Link href="/admin/properties">Back to properties</Link>
        </div>
      </div>

      <div className={styles.lifecycleNotice}>
        <span>Publication: {property.publicationStatus}</span>
        <span>Availability: {property.availability}</span>
        <span>Version: {property.version}</span>
      </div>

      <PropertyGallery
        coverMedia={property.coverMedia}
        gallery={property.gallery}
        propertyIdentifier={property.id}
      />

      <article className={styles.preview}>
        <p className={styles.eyebrow}>
          {propertyTypeLabel(property.propertyType)} · For {property.purpose} · Premier
          Property #{property.propertyId}
        </p>
        <h2>{property.title}</h2>
        <p className={styles.previewLocation}>{location}</p>
        <p className={styles.previewPrice}>{formatPrice(property.price.amount)}</p>
        <p className={styles.previewLead}>{property.shortDescription}</p>
        <div className={styles.previewBody}>
          <section>
            <h3>Description</h3>
            <p>{property.description}</p>
          </section>
          {specifications.length > 0 ? (
            <section>
              <h3>Specifications</h3>
              <dl>
                {specifications.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
          {[property.highlights, property.amenities, property.features].some(
            (items) => items.length > 0,
          ) ? (
            <section>
              <h3>Highlights and features</h3>
              <ul>
                {[
                  ...property.highlights,
                  ...property.amenities,
                  ...property.features,
                ].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </article>
    </section>
  );
}
