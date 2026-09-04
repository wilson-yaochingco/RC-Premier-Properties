import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about the positioning and property focus of RC Premier Properties in Angeles City and Pampanga.",
  alternates: { canonical: "/about" },
};

const principles = [
  {
    number: "01",
    title: "Clear information",
    description:
      "Present the details that shape a property decision in a format that is calm and easy to compare.",
  },
  {
    number: "02",
    title: "Relevant context",
    description:
      "Keep location, property type, budget, and practical requirements visible throughout the search.",
  },
  {
    number: "03",
    title: "Direct next steps",
    description:
      "Make it straightforward to ask about a listing, discuss a property, or request a viewing.",
  },
] as const;

export default function AboutPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <Section className="about-hero" tone="soft" aria-labelledby="about-heading">
        <Container>
          <SectionHeading
            number="001"
            eyebrow="About RC Premier Properties"
            as="h1"
            title={
              <span id="about-heading">
                Property decisions
                <br />
                deserve room to think.
              </span>
            }
            intro="RC Premier Properties is centered on a clear, considered property experience for Angeles City and the wider Pampanga area."
          />

          <div className="about-hero__media-wrap">
            <MediaPlaceholder label="ABOUT IMAGE" ratio="hero" tone="violet" />
            <p>
              A future home for supplied brand photography. The layout preserves the
              final media proportions without substituting stock imagery.
            </p>
          </div>
        </Container>
      </Section>

      <Section aria-labelledby="positioning-heading">
        <Container>
          <div className="editorial-split">
            <div className="chapter-label">
              <span aria-hidden="true">002</span>
              <p>Our positioning</p>
            </div>
            <div className="editorial-split__content">
              <h2 id="positioning-heading">
                A modern place to explore property with greater clarity.
              </h2>
              <div className="editorial-split__copy">
                <p>
                  The RC Premier Properties experience brings published listings, useful
                  property details, and inquiry paths together in one focused
                  destination.
                </p>
                <p>
                  Its primary geographic context is Angeles City, Pampanga, while
                  allowing room to explore relevant opportunities across the province as
                  inventory becomes available.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="dark" aria-labelledby="principles-heading">
        <Container>
          <SectionHeading
            number="003"
            eyebrow="Experience principles"
            title={
              <span id="principles-heading">
                Designed around
                <br />
                informed next steps.
              </span>
            }
            intro="These principles guide how property information and conversations are organized across the website."
          />

          <ol className="principles-grid">
            {principles.map((principle) => (
              <li key={principle.number}>
                <span aria-hidden="true">{principle.number}</span>
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section aria-labelledby="area-heading">
        <Container>
          <SectionHeading
            number="004"
            eyebrow="Geographic focus"
            title={
              <span id="area-heading">
                Angeles City,
                <br />
                within wider Pampanga.
              </span>
            }
            intro="The map area below is intentionally a placeholder until final location data and a map provider are supplied."
          />

          <div className="about-location">
            <MediaPlaceholder
              label="PAMPANGA LOCATION MAP"
              ratio="map"
              tone="neutral"
            />
            <div className="about-location__content">
              <p className="eyebrow">Primary context</p>
              <h3>Angeles City, Pampanga, Philippines</h3>
              <p>
                Search published listings by city or area, then refine by property type
                and price range.
              </p>
              <Button href="/properties?location=Angeles+City" variant="outline">
                Explore Angeles City
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      <Section
        className="about-contact"
        tone="accent"
        aria-labelledby="about-contact-heading"
      >
        <Container className="about-contact__inner">
          <div>
            <p className="eyebrow">005 · Start here</p>
            <h2 id="about-contact-heading">Tell us what you are looking for.</h2>
          </div>
          <p>
            Begin with a property question, discuss a listing, or share the requirements
            shaping your search.
          </p>
          <Button href="/contact" variant="primary">
            Contact RC Premier Properties
          </Button>
        </Container>
      </Section>
    </main>
  );
}
