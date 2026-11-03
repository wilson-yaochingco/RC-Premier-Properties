import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import aboutImage from "@/assets/site/about.png";
import guidanceImage from "@/assets/site/contact.png";
import visitImage from "@/assets/site/footer.png";
import discoverImage from "@/assets/site/home-hero-2.png";
import converseImage from "@/assets/site/home-hero-3.png";
import manifestoImage from "@/assets/site/home_hero.jpg";
import understandImage from "@/assets/site/properties.png";
import presentationImage from "@/assets/site/why-rc-premier.png";
import frame from "@/components/layout/editorial-page.module.css";
import { RcPremierMark } from "@/components/layout/RcPremierMark";
import { RollLabel } from "@/components/ui/RollLabel";
import { AboutHeroVideo } from "@/features/about/AboutHeroVideo";
import { PampangaBoundaryMap } from "@/features/about/PampangaBoundaryMap";
import {
  PAMPANGA_MAP_AREAS,
  PAMPANGA_MAP_HEIGHT,
  PAMPANGA_MAP_OUTLINE,
  PAMPANGA_MAP_WIDTH,
} from "@/features/locations/pampanga-map-data";
import { getPropertyFacets } from "@/features/properties/property.service";
import { buildPageMetadata } from "@/lib/seo";
import styles from "./about.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "About",
  description:
    "Learn how RC Premier Properties helps people discover residential properties across Pampanga and move from search to a direct conversation.",
  canonicalPath: "/about",
  imagePath: aboutImage.src,
});

const FOCUS = [
  "Residential property",
  "Pampanga",
  "Property discovery",
  "Buyer and seller conversations",
] as const;

const EXPERIENCE = [
  {
    title: "Discover",
    description: "Browse the current collection of published properties.",
    image: discoverImage,
    alt: "Residence with a private pool and balcony beneath a bright sky",
    href: "/properties",
    label: "Browse properties",
  },
  {
    title: "Understand",
    description: "Review pricing, imagery, specifications and location context.",
    image: understandImage,
    alt: "Living area with warm timber flooring and a sculptural staircase",
    href: "/locations",
    label: "Explore locations",
  },
  {
    title: "Visit",
    description: "Request a viewing at a preferred date and time for staff to confirm.",
    image: visitImage,
    alt: "Contemporary residence with a timber-clad upper volume",
    href: "/book-viewing",
    label: "Book a viewing",
  },
  {
    title: "Converse",
    description: "Continue directly with RC Premier about the next step.",
    image: converseImage,
    alt: "Double-height living and dining space with a mezzanine",
    href: "/contact",
    label: "Contact RC Premier",
  },
] as const;

const HOW_WE_WORK = [
  {
    title: "Clear property information",
    description:
      "Published listings bring the details, location context and next steps for a property into one focused view.",
  },
  {
    title: "Direct conversations",
    description:
      "Ask a question, start a seller inquiry or request a viewing. The team follows up using the details you provide.",
  },
  {
    title: "Explicit next steps",
    description:
      "Availability and request status stay explicit, so an inquiry is never presented as an agreement or a confirmed appointment.",
  },
] as const;

const CONTINUE = [
  {
    href: "/properties",
    label: "Properties",
    description: "Browse the current collection.",
  },
  {
    href: "/locations",
    label: "Locations",
    description: "Explore homes across Pampanga.",
  },
  {
    href: "/sell",
    label: "Sell",
    description: "Start a conversation about your property.",
  },
  { href: "/contact", label: "Contact", description: "Talk directly with RC Premier." },
] as const;

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** A decorative crop of the generated Pampanga geometry; the real map lives further down. */
function MapFragment() {
  return (
    <div className={styles.mapFragment} aria-hidden="true">
      <svg viewBox={`0 0 ${PAMPANGA_MAP_WIDTH} ${PAMPANGA_MAP_HEIGHT}`}>
        {PAMPANGA_MAP_AREAS.map((area) => (
          <path key={area.slug} d={area.d} />
        ))}
        <path d={PAMPANGA_MAP_OUTLINE} className={styles.mapFragmentOutline} />
      </svg>
    </div>
  );
}

async function loadPublishedLocationCount(): Promise<number | undefined> {
  try {
    const facets = await getPropertyFacets();
    const count = (facets.locationCounts ?? []).filter(
      (entry) => entry.count > 0,
    ).length;
    return count > 0 ? count : undefined;
  } catch {
    return undefined;
  }
}

export default async function AboutPage() {
  const locationCount = await loadPublishedLocationCount();

  return (
    <main id="main-content" tabIndex={-1} className={`${frame.page} ${styles.page}`}>
      {/* 1. Brand film */}
      <section className={styles.hero} aria-labelledby="about-heading">
        <AboutHeroVideo poster={aboutImage.src} />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroContent}>
          <p className={styles.eyebrowLight}>RC Premier Properties</p>
          <h1 id="about-heading" className={styles.heroTitle}>
            <span>Property,</span> <span>considered differently.</span>
          </h1>
          <p className={styles.heroLede}>
            Residential property discovery and guidance focused on Pampanga.
          </p>
        </div>
      </section>

      {/* 2. Who RC Premier is */}
      <section className={styles.who} aria-labelledby="who-heading">
        <RcPremierMark
          className={styles.whoMark}
          aria-hidden="true"
          focusable="false"
        />
        <div className={styles.container}>
          <div className={styles.whoLayout}>
            <h2 id="who-heading" className={styles.whoStatement}>
              RC Premier Properties helps people discover residential properties across
              Pampanga and move from search to conversation with clearer information and
              direct guidance.
            </h2>
            <aside className={styles.focus} aria-labelledby="focus-heading">
              <h3 id="focus-heading">Our focus</h3>
              <ul>
                {FOCUS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      {/* 3. Three principles as alternating bands */}
      <section className={styles.principles} aria-labelledby="principles-heading">
        <h2 id="principles-heading" className={styles.srOnly}>
          Three principles
        </h2>
        <article className={`${styles.band} ${styles.bandIvory}`}>
          <div className={`${styles.container} ${styles.bandLayout}`}>
            <MapFragment />
            <div className={styles.bandCopy}>
              <span className={styles.bandNumber} aria-hidden="true">
                01
              </span>
              <h3>Local knowledge</h3>
              <p>
                RC Premier focuses on residential property in Pampanga. Listings,
                location pages and conversations all begin from the province itself.
              </p>
            </div>
          </div>
        </article>
        <article className={`${styles.band} ${styles.bandStone} ${styles.bandReverse}`}>
          <div className={`${styles.container} ${styles.bandLayout}`}>
            <figure className={styles.bandImage}>
              <Image
                src={presentationImage}
                alt="Double-height entrance with warm timber and a sculptural pendant light"
                fill
                sizes="(max-width: 767px) 100vw, 50vw"
              />
            </figure>
            <div className={styles.bandCopy}>
              <span className={styles.bandNumber} aria-hidden="true">
                02
              </span>
              <h3>Thoughtful presentation</h3>
              <p>
                Each published listing brings together imagery, specifications and
                useful property context, so a home can be understood before anyone
                visits.
              </p>
            </div>
          </div>
        </article>
        <article className={`${styles.band} ${styles.bandIvory}`}>
          <div className={`${styles.container} ${styles.bandLayout}`}>
            <figure className={styles.bandImage}>
              <Image
                src={guidanceImage}
                alt="Dining table set beside a staircase in a bright contemporary home"
                fill
                sizes="(max-width: 767px) 100vw, 50vw"
              />
            </figure>
            <div className={styles.bandCopy}>
              <span className={styles.bandNumber} aria-hidden="true">
                03
              </span>
              <h3>Direct guidance</h3>
              <p>
                Inquiries and viewing requests start a conversation with RC Premier.
                They are never presented as instant, automated confirmations.
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* 4. Pampanga focus */}
      <section className={styles.region} aria-labelledby="region-heading">
        <div className={styles.container}>
          <div className={styles.regionLayout}>
            <div className={styles.regionCopy}>
              <p className={styles.eyebrowLight}>Our geographic focus</p>
              <h2 id="region-heading" className={styles.sectionTitleLight}>
                <span>Pampanga is not a filter.</span> <span>It is the context.</span>
              </h2>
              <p>
                RC Premier’s listings and guidance are focused on the province. Location
                pages are shaped by current inventory, with privacy-aware property
                mapping and approximate administrative boundaries.
              </p>
              {locationCount ? (
                <p className={styles.live}>
                  Current published inventory spans {locationCount}{" "}
                  {locationCount === 1 ? "location" : "locations"}.
                </p>
              ) : null}
              <Link href="/locations" className={`${styles.lightButton} cta`}>
                <RollLabel>Explore locations</RollLabel>
                <Arrow />
              </Link>
            </div>
            <PampangaBoundaryMap />
          </div>
        </div>
      </section>

      {/* 5. The experience */}
      <section className={styles.experience} aria-labelledby="experience-heading">
        <div className={styles.container}>
          <div className={styles.experienceLayout}>
            <div className={styles.experienceIntro}>
              <p className={styles.eyebrow}>The RC Premier experience</p>
              <h2 id="experience-heading" className={styles.experienceSequence}>
                {EXPERIENCE.map((stage, index) => (
                  <span key={stage.title}>
                    {stage.title}
                    {index < EXPERIENCE.length - 1 ? (
                      <span className={styles.sequenceArrow} aria-hidden="true">
                        {" "}
                        →
                      </span>
                    ) : null}
                  </span>
                ))}
              </h2>
            </div>
            <ol className={styles.stages}>
              {EXPERIENCE.map((stage, index) => (
                <li key={stage.title} className={styles.stage}>
                  <div className={styles.stageImage}>
                    <Image
                      src={stage.image}
                      alt={stage.alt}
                      fill
                      sizes="(max-width: 767px) 100vw, 45vw"
                    />
                  </div>
                  <div className={styles.stageCopy}>
                    <span className={styles.stageNumber} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3>{stage.title}</h3>
                    <p>{stage.description}</p>
                    <Link href={stage.href} className={styles.stageLink}>
                      <span>{stage.label}</span>
                      <Arrow />
                    </Link>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 6. Manifesto image */}
      <section className={styles.manifesto} aria-labelledby="manifesto-heading">
        <Image
          src={manifestoImage}
          alt=""
          fill
          sizes="100vw"
          className={styles.manifestoImage}
        />
        <div className={styles.manifestoShade} aria-hidden="true" />
        <h2 id="manifesto-heading" className={styles.manifestoTitle}>
          <span>Homes presented with context.</span>{" "}
          <span>Conversations kept human.</span>
        </h2>
      </section>

      {/* 7. How RC Premier works */}
      <section className={styles.works} aria-labelledby="works-heading">
        <div className={styles.container}>
          <h2 id="works-heading" className={styles.sectionTitle}>
            <span>Clear from the first search</span>{" "}
            <span>to the next conversation.</span>
          </h2>
          <ol className={styles.worksList}>
            {HOW_WE_WORK.map((item, index) => (
              <li key={item.title}>
                <span className={styles.worksNumber} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 8. Continue exploring */}
      <section className={styles.continue} aria-labelledby="continue-heading">
        <div className={styles.container}>
          <p className={styles.eyebrowLight}>Keep exploring</p>
          <h2 id="continue-heading" className={styles.srOnly}>
            Continue exploring
          </h2>
          <nav aria-label="Continue exploring">
            <ul className={styles.continueList}>
              {CONTINUE.map((item, index) => (
                <li key={item.href}>
                  <Link href={item.href} className={styles.continueRow}>
                    <span className={styles.continueNumber} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.continueLabel}>{item.label}</span>
                    <span className={styles.continueDescription}>
                      {item.description}
                    </span>
                    <span className={styles.continueArrow} aria-hidden="true">
                      <Arrow />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>
    </main>
  );
}
