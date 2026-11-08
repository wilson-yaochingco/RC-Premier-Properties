import Link from "next/link";
import styles from "./property-catalog.module.css";

const VALUES = [
  [
    "A local perspective",
    "Explore residential opportunities across Pampanga with a team focused on its communities and the properties it works with.",
  ],
  [
    "Homes with intention",
    "Thoughtful planning, modern architecture, and attention to everyday living guide RC Premier’s approach to developing homes.",
  ],
  [
    "Guidance from search to site",
    "Ask about a property, request a viewing, or talk through your location and budget with the RC Premier team.",
  ],
];

const STEPS = [
  {
    title: "Find your possibilities",
    body: "Browse published properties. Refine by location, type, and budget to see what fits.",
    href: "#property-results-title",
  },
  {
    title: "Take a closer look",
    body: "Open a listing to explore its photographs, price, specifications, and available details.",
    href: "#property-results-title",
  },
  {
    title: "Request a viewing",
    body: "Send your preferred date and property to the team. RC Premier will follow up to confirm arrangements.",
    href: "/book-viewing",
  },
  {
    title: "Talk about your next move",
    body: "Share your questions and what matters to you. The team can help you consider the next steps.",
    href: "/contact",
  },
];

export function PropertyValues() {
  return (
    <section
      className={styles.editorialSection}
      aria-labelledby="property-values-heading"
      data-motion="sequence"
    >
      <h2
        id="property-values-heading"
        className={styles.sectionHeading}
        data-motion-step="heading"
      >
        A place to live,
        <br />a place to <em>belong</em>
      </h2>
      <div className={styles.valueRows} data-motion-step="group" data-motion-at="0.25">
        {VALUES.map(([title, body]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PropertyJourney({ propertyHref }: { propertyHref?: string }) {
  return (
    <section
      className={styles.editorialSection}
      aria-labelledby="property-journey-heading"
      data-motion="sequence"
    >
      <h2
        id="property-journey-heading"
        className={styles.sectionHeading}
        data-motion-step="heading"
      >
        Your next move,
        <br />
        made <em>simpler</em>
      </h2>
      <ol className={styles.journeyGrid} data-motion-step="group" data-motion-at="0.3">
        {STEPS.map(({ title, body, href }, index) => (
          <li key={title}>
            <Link
              href={index === 1 ? (propertyHref ?? "#explore-pampanga-heading") : href}
              className={styles.journeyCard}
              aria-labelledby={`property-step-${index}`}
            >
              <span className={styles.stepNumber} aria-hidden="true">
                0{index + 1}
              </span>
              <h3 id={`property-step-${index}`}>{title}</h3>
              <p>
                {index === 1 && !propertyHref
                  ? "Explore Pampanga’s communities and the places that could suit your next move."
                  : body}
              </p>
              <span className={styles.journeyArrow} aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 12 12 4M4 4h8v8"
                    stroke="currentColor"
                    strokeWidth="1.25"
                  />
                </svg>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
