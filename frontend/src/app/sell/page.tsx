import type { Metadata } from "next";
import Image from "next/image";
import contactImage from "@/assets/site/contact.png";
import locationImage from "@/assets/site/location.png";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { InquiryForm } from "@/features/inquiries/InquiryForm";
import { buildPageMetadata } from "@/lib/seo";
import styles from "./sell.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Sell a Property",
  description:
    "Start a private property-selling conversation with RC Premier Properties in Pampanga.",
  canonicalPath: "/sell",
  imagePath: locationImage.src,
});

const steps = [
  {
    number: "01",
    title: "Share the essentials",
    description:
      "Tell us where the property is, what kind of home it is, and anything useful for an initial conversation.",
  },
  {
    number: "02",
    title: "The team reviews your inquiry",
    description:
      "RC Premier Properties can follow up using the contact details you provide and discuss what may be needed next.",
  },
  {
    number: "03",
    title: "Decisions stay explicit",
    description:
      "An inquiry is not a valuation, listing agreement, offer, approval, or promise that the property will be published.",
  },
] as const;

export default function SellPage() {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <section className={styles.hero} aria-labelledby="sell-heading">
        <Image
          src={locationImage}
          alt="Contemporary residence with timber cladding under a blue sky"
          fill
          priority
          sizes="100vw"
        />
        <div className={styles.heroShade} aria-hidden="true" />
        <Container className={styles.heroInner}>
          <div>
            <p className={styles.eyebrowLight}>For property owners</p>
            <h1 id="sell-heading">Your property. Your next move.</h1>
            <p>Start a private, direct conversation with RC Premier Properties.</p>
            <Button href="#seller-conversation" variant="secondary">
              Sell with us
            </Button>
          </div>
        </Container>
      </section>

      <section
        id="seller-conversation"
        className={styles.conversation}
        aria-labelledby="seller-conversation-heading"
      >
        <Container className={styles.conversationInner}>
          <div className={styles.conversationCopy}>
            <p className={styles.eyebrow}>Sell with us</p>
            <h2 id="seller-conversation-heading">Begin with the useful details.</h2>
            <p>
              Share the property information you are comfortable providing. This first
              step does not ask for ownership records, identity documents, or an
              account.
            </p>
            <p className={styles.disclaimer}>
              Submitting this form starts an inquiry only. It is not a valuation,
              listing agreement, offer, approval, or publication promise.
            </p>
          </div>
          <div className={styles.formPanel} role="region" aria-label="Seller inquiry">
            <InquiryForm
              defaultInquiryType="selling"
              source="sell-page"
              submitLabel="Start the conversation"
              simplifiedSeller
            />
          </div>
        </Container>
      </section>

      <section className={styles.process} aria-labelledby="process-heading">
        <Container className={styles.narrow}>
          <div className={styles.centerHeading}>
            <p className={styles.eyebrow}>What happens next</p>
            <h2 id="process-heading">A clear first conversation.</h2>
            <p>The process begins with facts and leaves every later decision open.</p>
          </div>
          <ol className={styles.stepGrid}>
            {steps.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className={styles.privacy} aria-labelledby="privacy-heading">
        <Container className={styles.privacyInner}>
          <figure>
            <Image
              src={contactImage}
              alt="Warm dining area inside a contemporary residence"
              fill
              sizes="(max-width: 800px) 100vw, 50vw"
            />
          </figure>
          <div>
            <p className={styles.eyebrow}>A private first step</p>
            <h2 id="privacy-heading">
              Keep sensitive documents out of the public form.
            </h2>
            <p>
              Start with contact details and practical property context. If further
              information is appropriate, the team can explain what is needed in a
              direct follow-up.
            </p>
            <p>
              No automated valuation is produced, no agreement is created, and no
              listing is published from this inquiry alone.
            </p>
            <Button href="#seller-conversation" variant="outline">
              Start your seller inquiry
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
