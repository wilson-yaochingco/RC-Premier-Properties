import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/brand/rc-premier-logo.png";
import { RcPremierMark } from "@/components/layout/RcPremierMark";
import homeHeroTwo from "@/assets/site/home-hero-2.png";
import { CloserLook } from "@/features/home/CloserLook";
import { CLOSER_LOOK_SLIDES } from "@/features/home/closer-look-slides";
import { ExplorePampangaSection } from "@/features/home/ExplorePampanga";
import { FeaturedPropertiesSection } from "@/features/home/FeaturedProperties";
import { EditorialCta } from "@/components/ui/EditorialCta";
import { PropertyToursSection } from "@/features/home/PropertyToursSection";
import { HomeIntroduction } from "@/features/home/HomeIntroduction";
import { WhyRcPremier } from "@/features/home/WhyRcPremier";
import { SellStatement } from "@/features/home/SellStatement";
import { RouteCards } from "@/features/home/RouteCards";
import { HomeHeroVideo } from "@/features/home/HomeHeroVideo";
import { HomeIntro } from "@/features/home/HomeIntro";
import { PageMotion } from "@/components/layout/PageMotion";
import { HomeHeroCover } from "@/features/home/HomeHeroCover";
import heroStyles from "@/features/home/hero.module.css";
import { buildSiteStructuredData, serializeJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

function HeroArrowIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function HomePage({ searchParams }: PageProps<"/">) {
  const structuredData = buildSiteStructuredData(logo.src);

  return (
    <main id="main-content" tabIndex={-1} data-layered-hero>
      <HomeIntro />
      <PageMotion />
      <HomeHeroCover />
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
        />
      ) : null}

      {/* 1. HERO SECTION */}
      <section
        className={heroStyles.hero}
        aria-labelledby="home-heading"
        data-home-hero
      >
        <div className={heroStyles.backdrop}>
          <HomeHeroVideo className={heroStyles.image} />
          <div className={heroStyles.shade} aria-hidden="true" />
        </div>
        <div className={heroStyles.cover} data-hero-cover aria-hidden="true" />

        <div className={heroStyles.content} data-hero-layer>
          <RcPremierMark
            className={heroStyles.logo}
            role="img"
            aria-label="RC Premier Properties"
          />
          <h1 id="home-heading" className={heroStyles.title}>
            <span className={heroStyles.titleLine}>
              <span>
                Find a <em>home</em>
              </span>
            </span>{" "}
            <span className={heroStyles.titleLine}>
              <span>worth coming</span>
            </span>{" "}
            <span className={heroStyles.titleLine}>
              <span>home to.</span>
            </span>
          </h1>
          <p className={heroStyles.intro}>
            Explore homes and properties across Pampanga with straightforward guidance
            from RC Premier.
          </p>
          <Link href="/properties" className={heroStyles.textLink}>
            <HeroArrowIcon />
            <span>Browse properties</span>
          </Link>
        </div>
        <aside
          className={heroStyles.card}
          aria-label="Explore locations"
          data-intro-last
        >
          <div className={heroStyles.cardImage}>
            <Image
              src={homeHeroTwo}
              alt="Contemporary RC Premier residential exterior"
              fill
              sizes="320px"
            />
          </div>
          <p>Explore available homes and properties across Pampanga.</p>
          <Link href="/locations" className={heroStyles.textLink}>
            <span>Explore locations</span>
            <HeroArrowIcon />
          </Link>
        </aside>
        <div className={heroStyles.scroll} aria-hidden="true">
          <span />
        </div>
      </section>

      {/* The next section starts here; it slides over the hero, and the header keys off it. */}
      <div data-home-hero-end aria-hidden="true" />
      <HomeIntroduction />
      <RouteCards />
      <WhyRcPremier />

      <FeaturedPropertiesSection searchParams={searchParams} />
      <CloserLook slides={CLOSER_LOOK_SLIDES} />
      <ExplorePampangaSection />

      {/* 6. SELL STATEMENT */}
      <SellStatement />

      {/* 7. PROPERTY TOURS */}
      <PropertyToursSection />

      <EditorialCta
        id="home-cta-heading"
        eyebrow="Ready when you are"
        headline={["Let’s find the right", "*property* for you."]}
        body="Tell us what matters most and RC Premier can help you narrow the search and plan the next step."
        label="Talk to RC Premier"
        href="/contact"
        wide
      />
    </main>
  );
}
