import type { InquirySource, InquiryType } from "@rc/shared";
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
