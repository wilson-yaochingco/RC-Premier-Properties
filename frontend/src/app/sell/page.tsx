import type { Metadata } from "next";
import Image from "next/image";
import type { PublicPropertySummary } from "@rc/shared";
import heroImage from "@/assets/site/home-hero-1.png";
import prepareImage from "@/assets/site/footer.png";
import frame from "@/components/layout/editorial-page.module.css";
import { RollLabel } from "@/components/ui/RollLabel";
import { InquiryForm } from "@/features/inquiries/InquiryForm";
import { PropertyCatalogCard } from "@/features/properties/PropertyCatalogCard";
import { getProperties } from "@/features/properties/property.service";
import {
  OFFICIAL_EMAIL,
  OFFICIAL_PHONE,
  OFFICIAL_PHONE_HREF,
} from "@/lib/public-contact";
import { buildPageMetadata } from "@/lib/seo";
import styles from "./sell.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Sell a Property",
  description:
    "Start a direct conversation with RC Premier Properties about selling a residential property in Pampanga. An inquiry is not a valuation or listing agreement.",
  canonicalPath: "/sell",
  imagePath: heroImage.src,
});

const PROPOSITION = [
  {
    title: "Presentation",
    description:
      "Imagery and the practical details of a home are brought together in one focused presentation.",
  },
  {
    title: "Context",
    description:
      "Location and property information stay visible from the first search to the listing itself.",
  },
  {
    title: "Conversation",
    description:
      "Interested buyers have a direct path to inquire, and RC Premier follows up with them.",
  },
] as const;

const JOURNEY = [
  {
    title: "Understand",
    description: "Start with the property and what you would like to do next.",
  },
  {
    title: "Prepare",
    description: "Gather the practical details needed for a useful first conversation.",
  },
  {
    title: "Present",
    description:
      "If the property moves forward, its information and presentation are prepared.",
  },
  {
    title: "Connect",
    description: "Interested buyers have a clear path to ask about the property.",
  },
  {
    title: "Move forward",
    description: "RC Premier follows up directly as the conversation develops.",
  },
] as const;

const PRESENTATION_NOTES = [
  {
    title: "Imagery",
    description: "Photography leads, so a home is seen before it is read about.",
  },
  {
    title: "Property details",
    description: "Price, type, rooms and areas follow one consistent format.",
  },
  {
    title: "Location context",
    description:
      "Every listing names its area within Pampanga, with privacy-aware mapping.",
  },
  {
    title: "Direct inquiry",
    description: "Each property page offers a question and a viewing-request path.",
  },
] as const;

const PREPARE = [
  "Property location or area",
  "Property type",
  "Basic specifications, such as rooms and lot or floor area",
  "Practical context you are comfortable sharing",
  "Your preferred contact details",
] as const;

const EXPECTATIONS = [
  {
    title: "An inquiry is a start",
    description: "It begins a direct conversation with RC Premier Properties.",
  },
  {
    title: "Not a valuation",
    description:
      "Submitting the inquiry does not create an automated or formal valuation.",
  },
  {
    title: "Not a listing agreement",
    description:
      "Submitting the inquiry does not create an agreement, approval, offer or guarantee of publication.",
  },
] as const;

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

async function loadSpecimen(): Promise<PublicPropertySummary | undefined> {
  try {
    return (await getProperties({ sort: "newest" }, undefined, 1)).items[0];
  } catch {
    return undefined;
  }
}

export default async function SellPage() {
  const specimen = await loadSpecimen();

  return (
    <main id="main-content" tabIndex={-1} className={`${frame.page} ${styles.page}`}>
      {/* 1. Hero */}
      <section className={styles.hero} aria-labelledby="sell-heading">
        <Image
          src={heroImage}
          alt="Contemporary two-storey residence with a charcoal roof and landscaped frontage"
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrowLight}>For property owners</p>
            <h1 id="sell-heading" className={styles.heroTitle}>
              <span>Your property deserves</span> <span>the right presentation.</span>
            </h1>
            <p className={styles.heroLede}>
              Start a direct conversation with RC Premier about selling a residential
              property in Pampanga.
            </p>
            <a href="#seller-inquiry" className={`${styles.lightButton} cta`}>
              <RollLabel>Start a seller conversation</RollLabel>
              <Arrow />
            </a>
          </div>
          <p className={styles.heroMeta} aria-hidden="true">
            RC Premier · Pampanga
          </p>
        </div>
      </section>

      {/* 2. Proposition */}
      <section className={styles.proposition} aria-labelledby="proposition-heading">
        <div className={styles.container}>
          <div className={styles.propositionLayout}>
            <p className={styles.eyebrow}>Sell with RC Premier</p>
            <h2 id="proposition-heading" className={styles.statement}>
              <span>More than putting a property online.</span>{" "}
              <span className={styles.statementQuiet}>
                Present it with clarity, context and intention.
              </span>
            </h2>
          </div>
          <ul className={styles.columns}>
            {PROPOSITION.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. Journey */}
      <section className={styles.journey} aria-labelledby="journey-heading">
        <div className={styles.container}>
          <div className={styles.journeyLayout}>
            <div className={styles.journeyIntro}>
              <p className={styles.eyebrowLight}>The selling journey</p>
              <h2 id="journey-heading" className={styles.sectionTitleLight}>
                <span>From first conversation</span> <span>to the next step.</span>
              </h2>
              <p className={styles.journeyNote}>
                Every stage after the first is a decision made together, never an
                automatic outcome of the inquiry.
              </p>
            </div>
            <ol className={styles.timeline}>
              {JOURNEY.map((step, index) => (
                <li key={step.title}>
                  <span className={styles.timelineNumber} aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 4. Presentation */}
      <section className={styles.presentation} aria-labelledby="presentation-heading">
        <div className={styles.container}>
          <h2 id="presentation-heading" className={styles.sectionTitle}>
            <span>A home should be easy</span> <span>to understand at a glance.</span>
          </h2>
          <div
            className={styles.specimenLayout}
            data-specimen={specimen ? "true" : undefined}
          >
            {specimen ? (
              <figure className={styles.specimen}>
                <PropertyCatalogCard property={specimen} />
                <figcaption>
                  A current published listing, shown as buyers see it.
                </figcaption>
              </figure>
            ) : null}
            <ol className={styles.notes}>
              {PRESENTATION_NOTES.map((note, index) => (
                <li key={note.title}>
                  <span className={styles.noteNumber} aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{note.title}</h3>
                  <p>{note.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 5. What to prepare */}
      <section className={styles.prepare} aria-labelledby="prepare-heading">
        <div className={styles.container}>
          <div className={styles.prepareLayout}>
            <figure className={styles.prepareImage}>
              <Image
                src={prepareImage}
                alt="Modern residence with timber-clad upper volume and white boundary wall"
                fill
                sizes="(max-width: 767px) 100vw, 45vw"
              />
            </figure>
            <div className={styles.prepareCopy}>
              <p className={styles.eyebrow}>Before you begin</p>
              <h2 id="prepare-heading" className={styles.sectionTitle}>
                Start with what you know.
              </h2>
              <p className={styles.prepareLede}>
                A useful first conversation needs only the essentials. These are good
                starting details:
              </p>
              <ul className={styles.prepareList}>
                {PREPARE.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <aside className={styles.privacy} aria-labelledby="privacy-heading">
                <h3 id="privacy-heading">Keep sensitive documents private</h3>
                <p>
                  Ownership records, IDs, contracts and similar sensitive documents
                  should not be submitted through this initial public inquiry. If more
                  is needed, the team explains what and how in a direct follow-up.
                </p>
              </aside>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Inquiry */}
      <section
        id="seller-inquiry"
        className={styles.inquiry}
        aria-labelledby="seller-inquiry-heading"
      >
        <div className={styles.container}>
          <div className={styles.inquiryLayout}>
            <div className={styles.inquiryCopy}>
              <p className={styles.eyebrowLight}>Ready when you are</p>
              <h2 id="seller-inquiry-heading" className={styles.sectionTitleLight}>
                Tell us about your property.
              </h2>
              <p>
                Share the property information you are comfortable providing. No account
                is created, and RC Premier follows up using the contact details you
                enter.
              </p>
              <dl className={styles.contact}>
                <div>
                  <dt>Phone</dt>
                  <dd>
                    <a href={OFFICIAL_PHONE_HREF}>{OFFICIAL_PHONE}</a>
                  </dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${OFFICIAL_EMAIL}`}>{OFFICIAL_EMAIL}</a>
                  </dd>
                </div>
              </dl>
            </div>
            <div className={styles.formPanel} role="region" aria-label="Seller inquiry">
              <InquiryForm
                defaultInquiryType="selling"
                source="sell-page"
                submitLabel="Start the conversation"
                simplifiedSeller
              />
            </div>
          </div>
        </div>
      </section>

      {/* 7. Expectations */}
      <section className={styles.expectations} aria-labelledby="expectations-heading">
        <div className={styles.container}>
          <div className={styles.expectationsLayout}>
            <h2 id="expectations-heading" className={styles.expectationsTitle}>
              What an inquiry is, and is not.
            </h2>
            <dl className={styles.disclosures}>
              {EXPECTATIONS.map((item) => (
                <div key={item.title}>
                  <dt>{item.title}</dt>
                  <dd>{item.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}
