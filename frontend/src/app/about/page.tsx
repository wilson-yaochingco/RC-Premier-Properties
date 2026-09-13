import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import aboutImage from "@/assets/site/about.png";
import propertiesImage from "@/assets/site/properties.png";
import whyImage from "@/assets/site/why-rc-premier.png";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { AboutHeroVideo } from "@/features/about/AboutHeroVideo";
import { PampangaBoundaryMap } from "@/features/about/PampangaBoundaryMap";
import { buildPageMetadata } from "@/lib/seo";
import styles from "./about.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "About",
  description:
    "Learn how RC Premier Properties helps people explore houses and residential properties for sale in Pampanga.",
  canonicalPath: "/about",
  imagePath: aboutImage.src,
});

const principles = [
  {
    number: "01",
    title: "Clear property information",
    description:
      "Published listings bring the details, location context, and next steps for a property into one focused view.",
  },
  {
    number: "02",
    title: "Direct conversations",
    description:
      "Ask a question, start a seller inquiry, or request a tour. The team can follow up using the details you provide.",
  },
  {
    number: "03",
    title: "A truthful next step",
    description:
      "Availability and request status stay explicit, so an inquiry is never presented as an agreement or confirmed appointment.",
  },
] as const;

const exploreLinks = [
  { href: "/properties", label: "Browse properties" },
  { href: "/locations", label: "Explore locations" },
  { href: "/sell", label: "Sell a property" },
  { href: "/contact", label: "Contact us" },
] as const;

function ClarityIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M7 20.5 24 8l17 12.5v19H7v-19Z" />
      <path d="M17 39V26h14v13M13 20h22" />
    </svg>
  );
}

function ConversationIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M7 9h27v21H18L9 38v-8H7V9Z" />
      <path d="M17 17h21v18H26l-7 5v-5h-2" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <section className={styles.hero} aria-labelledby="about-heading">
        <AboutHeroVideo poster={aboutImage.src} />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroContent}>
          <h1 id="about-heading">A property company with a clear purpose.</h1>
          <p>Helping people explore homes and take the next step with confidence.</p>
        </div>
      </section>

      <section className={styles.introduction} aria-labelledby="about-introduction">
        <Container className={styles.narrow}>
          <h2 id="about-introduction">
            RC Premier Properties offers houses and residential properties for sale in
            Pampanga.
          </h2>
          <p>
            Browse available listings, explore locations, inquire about properties, and
            schedule a viewing to find a home that suits your needs.
          </p>

          <div className={styles.purposeGrid}>
            <article>
              <ClarityIcon />
              <h3>Property discovery, made clearer</h3>
              <p>
                Search published homes, compare practical details, and keep the property
                context visible from discovery through inquiry.
              </p>
            </article>
            <article>
              <ConversationIcon />
              <h3>Technology that supports the conversation</h3>
              <p>
                The website connects public listings with direct inquiry and viewing
                request paths while staff remain responsible for follow-up.
              </p>
            </article>
          </div>

          <figure className={styles.statementImage}>
            <Image
              src={propertiesImage}
              alt="Warm modern living space in an RC Premier residence"
              fill
              sizes="(max-width: 800px) 92vw, 58rem"
            />
          </figure>
        </Container>
      </section>

      <section className={styles.region} aria-labelledby="region-heading">
        <Container className={styles.regionInner}>
          <div className={styles.regionHeading}>
            <p className={styles.eyebrow}>Our geographic focus</p>
            <h2 id="region-heading">Guiding your search across Pampanga.</h2>
            <p>
              Location pages are shaped by current published inventory, with useful area
              context and privacy-aware property mapping.
            </p>
            <Button href="/locations" variant="outline">
              Explore locations
            </Button>
          </div>
          <PampangaBoundaryMap />
        </Container>
      </section>

      <section className={styles.principles} aria-labelledby="principles-heading">
        <Container className={styles.narrowWide}>
          <div className={styles.centerHeading}>
            <p className={styles.eyebrow}>How we work</p>
            <h2 id="principles-heading">
              Practical guidance from search to follow-up.
            </h2>
          </div>
          <ol className={styles.principleGrid}>
            {principles.map((principle) => (
              <li key={principle.number}>
                <span>{principle.number}</span>
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className={styles.editorial} aria-label="RC Premier experience">
        <Container className={styles.editorialInner}>
          <figure>
            <Image
              src={whyImage}
              alt="Double-height entrance with warm wood and sculptural lighting"
              fill
              sizes="(max-width: 800px) 92vw, 43vw"
            />
          </figure>
          <div>
            <p className={styles.eyebrow}>A useful public experience</p>
            <h2>Homes presented with context.</h2>
            <p>
              Each published listing brings together pricing, specifications, imagery,
              location context, and a clear way to ask a question.
            </p>
            <Button href="/properties" variant="outline">
              View properties
            </Button>
          </div>
        </Container>
      </section>

      <section className={styles.explore} aria-labelledby="explore-heading">
        <Container className={styles.narrowWide}>
          <div className={styles.centerHeading}>
            <p className={styles.eyebrow}>Keep exploring</p>
            <h2 id="explore-heading">Choose your next step.</h2>
          </div>
          <nav aria-label="Continue exploring">
            <ul>
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span>{link.label}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </section>
    </main>
  );
}
