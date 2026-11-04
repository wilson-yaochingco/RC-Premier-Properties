import type { Metadata } from "next";
import Link from "next/link";
import contactImage from "@/assets/site/contact.png";
import frame from "@/components/layout/editorial-page.module.css";
import { DevHomepagePreview } from "@/features/home/DevHomepagePreview";
import { InquiryForm } from "@/features/inquiries/InquiryForm";
import { resolveViewingProperty } from "@/features/inquiries/viewing-property";
import {
  OFFICIAL_EMAIL,
  OFFICIAL_PHONE,
  OFFICIAL_PHONE_HREF,
} from "@/lib/public-contact";
import { buildPageMetadata } from "@/lib/seo";
import styles from "./contact.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact",
  description:
    "Send a property or general inquiry to RC Premier Properties in Pampanga.",
  canonicalPath: "/contact",
  imagePath: contactImage.src,
});

const HELPS = [
  "The property or area you have in mind",
  "Whether you are buying, selling or still exploring",
  "The best number to reach you on",
] as const;

function Arrow() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const query = await searchParams;
  // Resolved through the public property search, so only details the API returned are
  // shown. `contactPropertyFixture` is a development-only preview; production ignores it.
  const context = await resolveViewingProperty(
    firstValue(query.propertyId),
    firstValue(query.contactPropertyFixture),
  );

  return (
    <main id="main-content" tabIndex={-1} className={`${frame.page} ${styles.page}`}>
      <section className={styles.intro} aria-labelledby="contact-heading">
        <div className={styles.introMain}>
          <p className={styles.eyebrow}>Get in touch</p>
          <h1 id="contact-heading" className={styles.headline}>
            Let’s talk about your <em>next move.</em>
          </h1>
        </div>
        <div className={styles.introAside}>
          <p className={styles.lede}>
            Ask about a property, tell us what you are looking for, or reach the team
            directly.
          </p>
          <ul className={styles.channels} aria-label="Contact RC Premier directly">
            <li>
              <a href={OFFICIAL_PHONE_HREF}>
                <span className={styles.channelLabel}>Call</span>
                <span className={styles.channelValue}>{OFFICIAL_PHONE}</span>
                <Arrow />
              </a>
            </li>
            <li>
              <a href={`mailto:${OFFICIAL_EMAIL}`}>
                <span className={styles.channelLabel}>Email</span>
                <span className={styles.channelValue}>{OFFICIAL_EMAIL}</span>
                <Arrow />
              </a>
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.conversation} aria-labelledby="contact-form-heading">
        <div className={styles.card}>
          <div className={styles.rail}>
            <p className={styles.railEyebrow}>Send an inquiry</p>
            <h2 id="contact-form-heading" className={styles.railTitle}>
              How can we help?
            </h2>
            <p className={styles.railCopy}>
              Share as much or as little as you like. The team will follow up using the
              details you provide, so a few specifics help.
            </p>
            <p className={styles.helpsLabel}>It helps to mention</p>
            <ul className={styles.helps}>
              {HELPS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className={styles.formArea}>
            <InquiryForm
              variant="contact"
              defaultInquiryType={
                context.status === "resolved" || context.status === "unavailable"
                  ? "property"
                  : "general"
              }
              source="contact-page"
              submitLabel="Send inquiry"
              {...(context.status === "resolved" ? { property: context.property } : {})}
              {...(context.status === "unavailable"
                ? {
                    propertyId: context.propertyId,
                    propertyIssue: "lookup-failed" as const,
                  }
                : {})}
              {...(context.status === "not-found"
                ? { propertyIssue: "not-found" as const }
                : {})}
            />
          </div>

          <nav className={styles.more} aria-label="Other ways to get started">
            <Link href="/book-viewing">
              <span>Prefer to see it in person?</span>
              <strong>
                Book a viewing
                <Arrow />
              </strong>
            </Link>
            <Link href="/sell">
              <span>Thinking of selling?</span>
              <strong>
                Sell a property
                <Arrow />
              </strong>
            </Link>
          </nav>
        </div>
      </section>
      <DevHomepagePreview />
    </main>
  );
}
