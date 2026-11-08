import type { ReactNode } from "react";
import frame from "@/components/layout/editorial-page.module.css";
import styles from "./legal.module.css";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/** Date the three legal pages were last revised; update it with any change to their copy. */
export const LEGAL_UPDATED = { iso: "2026-11-08", label: "8 November 2026" };

export function LegalPage({
  title,
  description,
  sections,
}: {
  title: ReactNode;
  description: string;
  sections: readonly LegalSection[];
}) {
  return (
    <main id="main-content" tabIndex={-1} className={`${frame.page} ${styles.page}`}>
      <header className={styles.hero}>
        <p className={styles.eyebrow} data-enter>
          Legal
        </p>
        <h1 className={styles.title} data-enter="heading" data-enter-delay="1">
          {title}
        </h1>
        <p className={styles.lede} data-enter data-enter-delay="2">
          {description}
        </p>
        <p className={styles.updated} data-enter data-enter-delay="3">
          Last updated <time dateTime={LEGAL_UPDATED.iso}>{LEGAL_UPDATED.label}</time>
        </p>
      </header>

      <div className={styles.layout}>
        <nav className={styles.toc} aria-label="On this page">
          <p className={styles.tocLabel}>On this page</p>
          <ol>
            {sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className={styles.article}>
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className={styles.section}
            >
              <h2 id={`${section.id}-title`}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                {section.title}
              </h2>
              {section.body}
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}
