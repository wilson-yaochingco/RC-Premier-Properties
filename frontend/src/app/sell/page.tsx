import type { Metadata } from "next";
import Image from "next/image";
import aboutImage from "@/assets/site/about.png";
import contactImage from "@/assets/site/contact.png";
import footerImage from "@/assets/site/footer.png";
import locationImage from "@/assets/site/location.png";
import propertiesImage from "@/assets/site/properties.png";
import whyImage from "@/assets/site/why-rc-premier.png";
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

const choices = [
  {
    number: "01",
    title: "Share the essentials",
    description:
      "Begin with the property information and context you are comfortable sharing.",
  },
  {
    number: "02",
    title: "Discuss the next step",
    description:
      "Staff can follow up directly before any additional information is requested.",
  },
  {
    number: "03",
    title: "Keep decisions explicit",
    description:
      "An inquiry is not a valuation, agreement, offer, approval, or publishing promise.",
  },
] as const;

const benefits = [
  {
    number: "01",
    eyebrow: "Property context",
    title: "Start with facts, not assumptions.",
    description:
      "Use the conversation to establish the type of home, its location, and the practical details that shape the next discussion.",
    image: aboutImage,
    alt: "Open-air entrance of a contemporary RC Premier residence",
  },
  {
    number: "02",
    eyebrow: "Private first step",
    title: "No public document upload is required.",
    description:
      "The public seller form deliberately avoids collecting title, ownership, or identity documents. Staff can explain any later requirement directly.",
    image: contactImage,
    alt: "Warm dining area inside an RC Premier residence",
  },
  {
    number: "03",
    eyebrow: "Connected follow-up",
    title: "One inquiry, one clear conversation.",
    description:
      "Your submission enters the existing inquiry workflow for staff follow-up instead of creating a separate seller account or dashboard.",
    image: propertiesImage,
    alt: "Warm modern living room with a staircase",
  },
] as const;

export default function SellPage() {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <section className={styles.hero} aria-labelledby="sell-heading">
        <Image
          src={locationImage}
          alt="Contemporary Pampanga residence under a blue sky"
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
            <h2 id="seller-conversation-heading">
              Begin with a considered conversation.
            </h2>
            <p>
              Share the essentials about the property you may want to sell. This first
              step is intentionally simple and does not ask you to upload private
              ownership or identity documents.
            </p>
            <p className={styles.disclaimer}>
              Submitting this form starts an inquiry only. It is not a valuation,
              listing agreement, offer, approval, or promise that a property will be
              published.
            </p>
          </div>
          <div className={styles.formPanel} role="region" aria-label="Seller inquiry">
            <InquiryForm
              defaultInquiryType="selling"
              source="sell-page"
              submitLabel="Start the conversation"
            />
          </div>
        </Container>
      </section>

      <section className={styles.advantage} aria-labelledby="advantage-heading">
        <Container className={styles.narrow}>
          <div className={styles.centerHeading}>
            <p className={styles.eyebrow}>The RC Premier approach</p>
            <h2 id="advantage-heading">A clear path from question to next step.</h2>
            <p>Built around current information and direct staff follow-up.</p>
          </div>
          <div className={styles.advantageVisual}>
            <figure>
              <Image
                src={whyImage}
                alt="Double-height RC Premier home entrance with sculptural lighting"
                fill
                sizes="(max-width: 800px) 92vw, 60rem"
              />
            </figure>
            <aside>
              <span>01</span>
              <p>One connected inquiry workflow</p>
            </aside>
          </div>
        </Container>
      </section>

      <section className={styles.choices} aria-labelledby="choices-heading">
        <Container className={styles.narrow}>
          <div className={styles.centerHeading}>
            <p className={styles.eyebrow}>A practical beginning</p>
            <h2 id="choices-heading">More clarity. Fewer assumptions.</h2>
            <p>
              The public experience stays intentionally focused on the parts the current
              service can support.
            </p>
          </div>
          <ol className={styles.choiceGrid}>
            {choices.map((choice) => (
              <li key={choice.number}>
                <span>{choice.number}</span>
                <h3>{choice.title}</h3>
                <p>{choice.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className={styles.control} aria-labelledby="control-heading">
        <Image
          src={footerImage}
          alt="Contemporary home exterior with warm timber details"
          fill
          sizes="100vw"
        />
        <div className={styles.controlShade} aria-hidden="true" />
        <Container className={styles.controlInner}>
          <div>
            <p className={styles.eyebrowLight}>Your property, your decision</p>
            <h2 id="control-heading">You decide how the conversation begins.</h2>
            <p>
              Share only the information needed for an initial follow-up. No account is
              created and no agreement is implied by submitting the form.
            </p>
            <a href="#seller-conversation">Return to the seller inquiry</a>
          </div>
        </Container>
      </section>

      <section className={styles.benefits} aria-labelledby="benefits-heading">
        <Container className={styles.benefitsInner}>
          <div className={styles.centerHeading}>
            <p className={styles.eyebrow}>What the first step includes</p>
            <h2 id="benefits-heading">A thoughtful seller inquiry.</h2>
            <p>
              A focused intake protects the boundary between an early conversation and
              any later business decision.
            </p>
          </div>
          <ol className={styles.benefitList}>
            {benefits.map((benefit) => (
              <li key={benefit.number}>
                <div className={styles.benefitCopy}>
                  <span>{benefit.number}</span>
                  <p className={styles.eyebrow}>{benefit.eyebrow}</p>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </div>
                <figure>
                  <Image
                    src={benefit.image}
                    alt={benefit.alt}
                    fill
                    sizes="(max-width: 800px) 92vw, 31rem"
                  />
                </figure>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className={styles.results} aria-labelledby="results-heading">
        <Container className={styles.narrow}>
          <div className={styles.centerHeading}>
            <p className={styles.eyebrowLight}>A connected process</p>
            <h2 id="results-heading">
              Every claim stays grounded in what the service does.
            </h2>
          </div>
          <dl>
            <div>
              <dt>Inquiry</dt>
              <dd>Saved for staff follow-up</dd>
            </div>
            <div>
              <dt>Documents</dt>
              <dd>Not collected publicly</dd>
            </div>
            <div>
              <dt>Outcome</dt>
              <dd>No agreement is assumed</dd>
            </div>
          </dl>
        </Container>
      </section>

      <section className={styles.presentation} aria-labelledby="presentation-heading">
        <Container className={styles.presentationInner}>
          <div>
            <p className={styles.eyebrow}>Published inventory</p>
            <h2 id="presentation-heading">
              How homes appear on RC Premier Properties.
            </h2>
            <p>
              Approved published listings can present imagery, price, specifications,
              availability, and privacy-aware location context in one responsive page.
              Publication is never promised by an inquiry.
            </p>
            <Button href="/properties" variant="outline">
              View current properties
            </Button>
          </div>
          <figure>
            <Image
              src={propertiesImage}
              alt="Modern living area representative of RC Premier website photography"
              fill
              sizes="(max-width: 800px) 92vw, 50vw"
            />
            <figcaption>Existing authorized RC Premier imagery</figcaption>
          </figure>
        </Container>
      </section>

      <section className={styles.terms} aria-labelledby="terms-heading">
        <Container className={styles.narrow}>
          <div className={styles.centerHeading}>
            <p className={styles.eyebrow}>Start on your terms</p>
            <h2 id="terms-heading">A simple first conversation.</h2>
          </div>
          <div className={styles.termsGrid}>
            <article>
              <h3>Share only what is useful now.</h3>
              <p>
                Start with the property type, location, and message you want the team to
                consider. Private documents do not belong in the public form.
              </p>
            </article>
            <figure>
              <Image
                src={aboutImage}
                alt="Contemporary home entrance with a bright open-air courtyard"
                fill
                sizes="(max-width: 800px) 92vw, 36rem"
              />
            </figure>
            <article>
              <h3>No automated valuation claim.</h3>
              <p>
                RC Premier Properties has not introduced a public appraisal engine. The
                form begins a human follow-up, not an instant price estimate.
              </p>
            </article>
            <figure>
              <Image
                src={contactImage}
                alt="Warm dining space in a contemporary residence"
                fill
                sizes="(max-width: 800px) 92vw, 36rem"
              />
            </figure>
          </div>
          <div className={styles.finalAction}>
            <p>Ready to begin?</p>
            <Button href="#seller-conversation">Start the conversation</Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
