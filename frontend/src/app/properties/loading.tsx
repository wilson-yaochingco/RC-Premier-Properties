import {
  CatalogIntro,
  CatalogSkeleton,
} from "@/features/properties/PropertyCatalogSections";
import styles from "@/features/properties/property-catalog.module.css";

/** Visual placeholder only; assistive tech gets the status line and the real page. */
export default function PropertiesLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <p role="status" className="visually-hidden">
        Loading properties
      </p>
      <div aria-hidden="true">
        <CatalogIntro />
        <section className={styles.results}>
          <div className={styles.container}>
            <CatalogSkeleton />
          </div>
        </section>
      </div>
    </div>
  );
}
