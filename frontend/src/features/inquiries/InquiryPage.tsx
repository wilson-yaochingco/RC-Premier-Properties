import type { InquirySource, InquiryType } from "@rc/shared";
import Image from "next/image";
import contactImage from "@/assets/site/contact.png";
import viewingImage from "@/assets/site/book-viewing.png";
import { InquiryForm } from "./InquiryForm";
import styles from "./InquiryPage.module.css";

interface InquiryPageProps {
  eyebrow: string;
  title: string;
  description: string;
  note: string;
  formLabel: string;
  inquiryType: InquiryType;
  source: InquirySource;
  propertyId?: string;
  submitLabel: string;
}

export function InquiryPage({
  eyebrow,
  title,
  description,
  note,
  formLabel,
  inquiryType,
  source,
  propertyId,
  submitLabel,
}: InquiryPageProps) {
  const image = source === "viewing-page" ? viewingImage : contactImage;
  const imageAlt =
    source === "viewing-page"
      ? "Landscaped private garden beside a residence"
      : "Dining area with warm wood finishes and sculptural lighting";

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.container}>
        <div className={styles.layout}>
          <section className={styles.intro} aria-labelledby="inquiry-page-title">
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 id="inquiry-page-title" className={styles.title}>
              {title}
            </h1>
            <p className={styles.copy}>{description}</p>
            <p className={styles.note}>{note}</p>
            <p className={styles.directContact}>
              <a href="mailto:rcpremierph@gmail.com">rcpremierph@gmail.com</a>
              <a href="tel:+639184291873">+63 918 429 1873</a>
              <a
                href="https://www.facebook.com/people/RC-Premier-Properties/61588365958516/"
                target="_blank"
                rel="noreferrer"
              >
                Facebook
              </a>
            </p>
            <figure className={styles.image}>
              <Image
                src={image}
                alt={imageAlt}
                fill
                sizes="(max-width: 900px) 100vw, 40vw"
              />
            </figure>
          </section>

          <section className={styles.formPanel} aria-label={formLabel}>
            <p className={styles.formLabel}>{formLabel}</p>
            <InquiryForm
              defaultInquiryType={inquiryType}
              source={source}
              propertyId={propertyId}
              submitLabel={submitLabel}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
