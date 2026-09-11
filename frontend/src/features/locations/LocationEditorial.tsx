import Image from "next/image";
import { Container } from "@/components/ui/Container";
import type { LocationEditorialContent } from "./location-content";
import styles from "./locations.module.css";

export function LocationEditorial({
  content,
  inventoryCount,
}: {
  content: LocationEditorialContent;
  inventoryCount: number;
}) {
  const { scenery } = content;

  return (
    <section className={styles.editorial} aria-labelledby="location-editorial-title">
      <Container className={styles.guideContainer}>
        <div className={styles.editorialHeading}>
          <p>Around {content.locality}</p>
          <div>
            <h2 id="location-editorial-title">A view of the local setting.</h2>
            <p>
              This guide pairs a sourced photograph of everyday {content.locality} with
              current published property inventory. It does not rank neighborhoods or
              make unsupported area claims.
            </p>
          </div>
        </div>

        <div className={styles.editorialFeature}>
          <figure>
            <Image
              src={scenery.imagePath}
              alt={scenery.alt}
              fill
              sizes="(max-width: 1023px) 100vw, 62rem"
            />
            <figcaption>
              <span>{scenery.caption}</span>
              <span>
                Photo: {scenery.creator} ·{" "}
                <a href={scenery.sourceUrl} target="_blank" rel="noreferrer">
                  Wikimedia Commons
                </a>{" "}
                ·{" "}
                {scenery.licenseUrl ? (
                  <a href={scenery.licenseUrl} target="_blank" rel="noreferrer">
                    {scenery.license}
                  </a>
                ) : (
                  scenery.license
                )}
              </span>
            </figcaption>
          </figure>

          <dl>
            <div>
              <dt>Scene</dt>
              <dd>{scenery.title}</dd>
            </div>
            <div>
              <dt>Locality type</dt>
              <dd>{content.classification}</dd>
            </div>
            <div>
              <dt>Current published inventory</dt>
              <dd>
                {inventoryCount.toLocaleString("en-PH")}{" "}
                {inventoryCount === 1 ? "current listing" : "current listings"}
              </dd>
            </div>
          </dl>
        </div>
      </Container>
    </section>
  );
}
