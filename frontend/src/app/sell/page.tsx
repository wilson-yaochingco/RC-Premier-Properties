import type { Metadata } from "next";
import Image from "next/image";
import ogImage from "@/assets/site/home-hero-1.png";
import frame from "@/components/layout/editorial-page.module.css";
import { EditorialCta } from "@/components/ui/EditorialCta";
import { RollLabel } from "@/components/ui/RollLabel";
import { InquiryForm } from "@/features/inquiries/InquiryForm";
import {
  OFFICIAL_EMAIL,
  OFFICIAL_PHONE,
  OFFICIAL_PHONE_HREF,
} from "@/lib/public-contact";
import { buildPageMetadata } from "@/lib/seo";
import styles from "./sell.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Sell a Property",
  description:
    "Start a direct conversation with RC Premier Properties about selling a residential property in Pampanga. An inquiry is not a valuation or listing agreement.",
  canonicalPath: "/sell",
  imagePath: ogImage.src,
});

const STEPS = [
  {
    title: "Share the essentials",
    description: "Tell us where the property is and what you’d like to discuss.",
  },
  {
    title: "We review your inquiry",
    description: "Our team reviews the details and follows up with you directly.",
  },
  {
    title: "Discuss what’s next",
    description:
      "We’ll talk through possible next steps, without an automatic commitment.",
  },
] as const;

const REASSURANCES = [
  "An inquiry does not create a valuation or listing agreement.",
  "Submitting a property does not mean it is approved or published.",
  "Keep IDs and ownership documents out of this form. We’ll explain how to share them if needed.",
] as const;

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function SellPage() {
  return (
    <main id="main-content" tabIndex={-1} className={`${frame.page} ${styles.page}`}>
      {/* 1. Hero: typography and the supplied architectural drawing */}
      <section className={styles.hero} aria-labelledby="sell-heading">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Sell with RC Premier</p>
          <h1 id="sell-heading" className={styles.headline}>
            Thinking of selling your property?
          </h1>
        </div>
        <Image
          className={styles.heroArt}
          src="/images/sell/sell-hero-house.svg"
          alt=""
          aria-hidden="true"
          width={1000}
          height={522}
          priority
          sizes="(max-width: 767px) 100vw, 56vw"
        />
      </section>

      {/* 2. Inquiry */}
      <section
        id="seller-inquiry"
        className={styles.inquiry}
        aria-labelledby="seller-inquiry-heading"
      >
        <div className={styles.card}>
          <div className={styles.rail}>
            <p className={styles.railEyebrow}>Start here</p>
            <h2 id="seller-inquiry-heading" className={styles.railTitle}>
              Tell us about your property.
            </h2>
            <p className={styles.railCopy}>
              A few details are enough to begin. No ownership documents are needed at
              this stage, and no account is created.
            </p>
            <ul className={styles.channels} aria-label="Contact RC Premier directly">
              <li>
                <a href={OFFICIAL_PHONE_HREF} className="cta cta--wrap">
                  <span className={styles.channelLabel}>Call</span>
                  <span className={styles.channelValue}>
                    <RollLabel>{OFFICIAL_PHONE}</RollLabel>
                  </span>
                  <Arrow />
                </a>
              </li>
              <li>
                <a href={`mailto:${OFFICIAL_EMAIL}`} className="cta cta--wrap">
                  <span className={styles.channelLabel}>Email</span>
                  <span className={styles.channelValue}>
                    <RollLabel>{OFFICIAL_EMAIL}</RollLabel>
                  </span>
                  <Arrow />
                </a>
              </li>
            </ul>
          </div>
          <div className={styles.formArea}>
            <InquiryForm
              variant="seller"
              defaultInquiryType="selling"
              source="sell-page"
              submitLabel="Send seller inquiry"
            />
          </div>
        </div>
      </section>

      {/* 3. Process */}
      <section className={styles.process} aria-labelledby="process-heading">
        <h2 id="process-heading" className="visually-hidden">
          What happens next
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className={styles.stepNumber} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 4. Reassurance */}
      <section className={styles.reassurance} aria-labelledby="reassurance-heading">
        <div className={styles.copy}>
          <h2 id="reassurance-heading" className={styles.sectionTitle}>
            A first conversation, not a commitment.
          </h2>
          <p>
            Share what you know. We’ll discuss any additional information directly when
            needed.
          </p>
        </div>
        <ul className={styles.points}>
          {REASSURANCES.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <EditorialCta
        id="sell-cta-heading"
        eyebrow="Ready when you are"
        headline={["Tell us about", "your property."]}
        body="A few details are enough to begin the conversation."
        label="Start your inquiry"
        href="#seller-inquiry"
      />
    </main>
  );
}
