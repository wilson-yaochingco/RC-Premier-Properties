import Image from "next/image";
import styles from "./why-rc-premier.module.css";

const STATEMENTS = [
  {
    index: "01",
    title: "Pampanga-focused",
    body: "Local knowledge of communities, residential opportunities, and the properties RC Premier works with across Pampanga.",
  },
  {
    index: "02",
    title: "Designed and built with intention",
    body: "RC Premier develops residential homes with thoughtful planning, modern architecture, quality materials, and attention to everyday living.",
  },
  {
    index: "03",
    title: "Guidance from search to site",
    body: "Whether you’re exploring a property, planning a home, investing, or preparing to sell, RC Premier helps keep the next steps clear and personal.",
  },
] as const;

/** Architectural presentation board: the approved house drawing with three trust statements. */
export function WhyRcPremier() {
  return (
    <section className={styles.section} aria-labelledby="why-rc-premier-heading">
      <h2 id="why-rc-premier-heading" className="visually-hidden">
        Why RC Premier
      </h2>
      <div className={styles.container}>
        <div className={styles.board}>
          <Image
            className={styles.house}
            src="/images/home/why-rc-premier-house.svg"
            alt="Line drawing of a contemporary two-storey home with a walled front court"
            width={1211}
            height={562}
            sizes="(max-width: 1023px) 100vw, 56vw"
          />
          {STATEMENTS.map(({ index, title, body }) => (
            <article key={index} className={styles.statement} data-index={index}>
              <h3 className={styles.title}>{title}</h3>
              <p className={styles.body}>{body}</p>
              <span className={styles.index} aria-hidden="true">
                {index}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
