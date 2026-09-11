import type { Metadata } from "next";
import Image from "next/image";
import contactImage from "@/assets/site/contact.png";
import { Container } from "@/components/ui/Container";
import { InquiryForm } from "@/features/inquiries/InquiryForm";
import {
  OFFICIAL_EMAIL,
  OFFICIAL_PHONE,
  OFFICIAL_PHONE_HREF,
  OFFICIAL_SOCIAL_LINKS,
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

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const query = await searchParams;
  const rawPropertyId = query.propertyId;
  const propertyId = Array.isArray(rawPropertyId) ? rawPropertyId[0] : rawPropertyId;

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <section className={styles.hero} aria-labelledby="contact-heading">
        <div>
          <h1 id="contact-heading">Say hello.</h1>
          <p>Tell us how we can help with your next property decision.</p>
        </div>
      </section>

      <section className={styles.imagePanel} aria-labelledby="guidance-heading">
        <Image
          src={contactImage}
          alt="Dining area with warm wood finishes and sculptural lighting"
          fill
          priority
          sizes="100vw"
        />
        <Container className={styles.imagePanelInner}>
          <article className={styles.guidanceCard}>
            <p className={styles.eyebrow}>Property guidance</p>
            <h2 id="guidance-heading">Looking for the right next step?</h2>
            <p>
              Ask about a published property, share what you are looking for, or begin a
              private seller conversation. The team will follow up directly.
            </p>
            <a href="#start-a-conversation">Start a conversation</a>
          </article>
        </Container>
      </section>

      <section
        id="start-a-conversation"
        className={styles.conversation}
        aria-labelledby="conversation-heading"
      >
        <Container className={styles.conversationInner}>
          <div className={styles.conversationIntro}>
            <p className={styles.eyebrow}>Tell us what brings you here</p>
            <h2 id="conversation-heading">Start a Conversation.</h2>
            <p>
              Send a general question or include a Premier Property number. Accepted
              inquiries are saved for staff follow-up; notification delivery is handled
              separately and is never presented as guaranteed email delivery.
            </p>
            <div className={styles.directLinks}>
              <a href={`mailto:${OFFICIAL_EMAIL}`}>{OFFICIAL_EMAIL}</a>
              <a href={OFFICIAL_PHONE_HREF}>{OFFICIAL_PHONE}</a>
            </div>
          </div>
          <div
            className={styles.formPanel}
            role="region"
            aria-label="Start a conversation form"
          >
            <InquiryForm
              defaultInquiryType={propertyId ? "property" : "general"}
              source="contact-page"
              propertyId={propertyId}
              submitLabel="Send inquiry"
            />
          </div>
        </Container>
      </section>

      <section className={styles.direct} aria-labelledby="direct-heading">
        <Container className={styles.directInner}>
          <h2 id="direct-heading">Need a direct line?</h2>
          <div className={styles.directGrid}>
            <article>
              <h3>General questions</h3>
              <p>Send a message by email whenever that is more convenient.</p>
              <a href={`mailto:${OFFICIAL_EMAIL}`}>{OFFICIAL_EMAIL}</a>
            </article>
            <article>
              <h3>Call RC Premier</h3>
              <p>Speak with the team about a property or an existing inquiry.</p>
              <a href={OFFICIAL_PHONE_HREF}>{OFFICIAL_PHONE}</a>
            </article>
            <article>
              <h3>Follow along</h3>
              <p>See current RC Premier Properties updates on our official channels.</p>
              <ul className={styles.socialLinks}>
                {OFFICIAL_SOCIAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${link.label} — RC Premier Properties (opens in a new tab)`}
                    >
                      <span aria-hidden="true">{link.label.slice(0, 2)}</span>
                      <span>{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </Container>
      </section>
    </main>
  );
}
