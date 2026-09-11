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
  const { landmark } = content;

  return (
    <section className={styles.editorial} aria-labelledby="location-editorial-title">
      <Container className={styles.guideContainer}>
        <div className={styles.editorialHeading}>
          <p>Around {content.locality}</p>
          <div>
            <h2 id="location-editorial-title">A documented local landmark.</h2>
            <p>
              This guide pairs a verified photograph from {content.locality} with the
              current published property inventory. It does not rank neighborhoods or
              make unsupported area claims.
            </p>
          </div>
        </div>

        <div className={styles.editorialFeature}>
          <figure>
            <Image
              src={landmark.imagePath}
              alt={landmark.alt}
              fill
              sizes="(max-width: 1023px) 100vw, 62rem"
            />
            <figcaption>
              <span>{landmark.caption}</span>
              <span>
                Photo: {landmark.creator} ·{" "}
                <a href={landmark.sourceUrl} target="_blank" rel="noreferrer">
                  Wikimedia Commons
                </a>{" "}
                ·{" "}
                {landmark.licenseUrl ? (
                  <a href={landmark.licenseUrl} target="_blank" rel="noreferrer">
                    {landmark.license}
                  </a>
                ) : (
                  landmark.license
                )}
              </span>
            </figcaption>
          </figure>

          <dl>
            <div>
              <dt>Place</dt>
              <dd>{landmark.title}</dd>
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
