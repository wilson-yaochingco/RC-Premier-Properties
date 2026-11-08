import { CatalogSkeleton } from "@/features/properties/PropertyCatalogSections";
import styles from "@/features/properties/property-catalog.module.css";

/**
 * Visual placeholder only; assistive tech gets the status line and the real page. The blocks
 * match the intro, filters and card grid so nothing moves when the page arrives, and they
 * only show once the wait is noticeable (see `.sk-page`).
 */
export default function PropertiesLoading() {
  return (
    <div className={`${styles.page} sk-page`} aria-busy="true">
      <p role="status" className="visually-hidden">
        Loading properties
      </p>
      <div aria-hidden="true">
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <span
              className="sk"
              style={{ width: "min(48rem, 90%)", height: "9rem", marginBottom: "3rem" }}
            />
            <span className="sk" style={{ width: "100%", height: "7rem" }} />
          </div>
        </section>
        <section className={styles.results}>
          <div className={styles.container}>
            <CatalogSkeleton />
          </div>
        </section>
      </div>
    </div>
  );
}
