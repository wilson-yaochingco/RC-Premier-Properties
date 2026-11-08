import Image from "next/image";
import exterior from "@/assets/site/home-hero-1.png";
import interior from "@/assets/site/properties.png";
import leftExterior from "@/assets/site/footer.png";
import architecturalDetail from "@/assets/site/why-rc-premier.png";
import poolside from "@/assets/site/home-hero-2.png";
import portrait from "@/assets/site/location.png";
import aboutImage from "@/assets/site/about.png";
import { HomeHeroVideo } from "@/features/home/HomeHeroVideo";
import frame from "@/components/layout/editorial-page.module.css";
import { EditorialCta } from "@/components/ui/EditorialCta";
import { AboutGallery } from "@/features/about/AboutGallery";
import { AboutPlaces } from "@/features/about/AboutPlaces";
import { PageMotion } from "@/components/layout/PageMotion";
import { HomeHeroCover } from "@/features/home/HomeHeroCover";
import heroStyles from "@/features/home/hero.module.css";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { buildPageMetadata } from "@/lib/seo";
import styles from "./about.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "About Us: Real Estate in Pampanga",
  description:
    "RC Premier Properties helps buyers and sellers across Pampanga find the right property, understand its value and move forward through a direct conversation.",
  canonicalPath: "/about",
  imagePath: aboutImage.src,
});

export default function AboutPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`${frame.page} ${frame.flush} ${styles.page}`}
      data-layered-hero
    >
      <PageMotion />
      <HomeHeroCover />
      <section
        className={styles.hero}
        data-about-hero
        data-home-hero
        aria-labelledby="about-heading"
      >
        <HomeHeroVideo src="/media/about-hero.mp4" className={styles.heroImage} />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={heroStyles.cover} data-hero-cover aria-hidden="true" />
        <div className={styles.heroContent} data-hero-layer>
          <div>
            <h1 id="about-heading">
              <span className={styles.line}>
                <span style={{ "--line": 0 } as CSSProperties}>
                  Rooted in <em>Pampanga</em>.
                </span>
              </span>{" "}
              <br />
              <span className={styles.line}>
                <span style={{ "--line": 1 } as CSSProperties}>
                  Focused on your move.
                </span>
              </span>{" "}
              <br className={styles.desktopBreak} />
              <span className={styles.line}>
                <span style={{ "--line": 2 } as CSSProperties}>
                  Here for what&apos;s next.
                </span>
              </span>
            </h1>
          </div>
          <p className={styles.heroLede} data-enter data-enter-delay="4">
            Residential properties, thoughtful presentation, and direct guidance for
            people buying or selling across Pampanga.
          </p>
        </div>
      </section>
      <div data-home-hero-end aria-hidden="true" />
      <section className={styles.who} aria-labelledby="who-heading">
        <div className={styles.statement}>
          <p className={styles.eyebrow} data-motion="fade">
            Who we are
          </p>
          <h2 id="who-heading" data-motion="heading">
            Thoughtfully presented <em>homes</em>, clearer property <em>decisions</em>,
            and a more personal way forward in <em>Pampanga</em>.
          </h2>
          <p data-motion="fade">
            RC Premier Properties brings together residential homes, thoughtful
            presentation, and clear property information across Pampanga. Through local
            context and direct conversations, we help buyers and sellers better
            understand their options and take the next step.
          </p>
        </div>
        <div
          className={styles.mosaic}
          data-motion="photos"
          data-motion-reveal="fade"
          data-motion-stagger="0.14"
        >
          <figure className={styles.mosaicLeft} data-motion-frame>
            <Image
              src={leftExterior}
              alt="Contemporary residence with timber cladding and a white boundary wall"
              fill
              sizes="(max-width: 767px) 50vw, 33vw"
            />
          </figure>
          <figure className={styles.mosaicDetail} data-motion-frame>
            <Image
              src={architecturalDetail}
              alt="Double-height entrance with warm timber and a sculptural pendant light"
              fill
              sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 17vw"
            />
          </figure>
          <figure className={styles.mosaicMain} data-motion-frame>
            <Image
              src={exterior}
              alt="Contemporary residence with a sloping charcoal roof and planted frontage"
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 100vw, 42vw"
            />
          </figure>
          <figure className={styles.mosaicRight} data-motion-frame>
            <Image
              src={poolside}
              alt="Residence with a pool and balcony beneath a bright sky"
              fill
              sizes="(max-width: 767px) 50vw, (max-width: 1023px) 50vw, 25vw"
            />
          </figure>
          <figure className={styles.mosaicLower} data-motion-frame>
            <Image
              src={interior}
              alt="Living area with warm timber flooring and a sculptural staircase"
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 42vw"
            />
          </figure>
          <figure className={styles.mosaicPortrait} data-motion-frame>
            <Image
              src={portrait}
              alt="Timber-soffit residence with stone cladding beneath a clear blue sky"
              fill
              sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
            />
          </figure>
        </div>
      </section>
      <section className={styles.drives} aria-labelledby="drives-heading">
        <h2 id="drives-heading" data-motion="fade">
          Thoughtful <br className={styles.drivesBreak} />
          <em>homes</em>, clearer <br className={styles.drivesBreak} />
          decisions
        </h2>
        <article className={styles.row} data-motion="fade">
          <h3>Our perspective</h3>
          <p>
            RC Premier&apos;s residential work emphasizes thoughtful planning, modern
            architecture, and attention to everyday living.
          </p>
        </article>
        <article className={styles.row} data-motion="fade">
          <h3>Our approach</h3>
          <p>
            Clear property information, useful location context, and direct follow-up
            help buyers and sellers understand their options and discuss the next step.
          </p>
        </article>
      </section>
      <AboutPlaces />
      <AboutGallery />
      <EditorialCta
        id="about-cta-heading"
        eyebrow="Your next move"
        headline={["Every next step starts", "with a *conversation*."]}
        body="Explore your options with RC Premier Properties."
        label="Talk to RC Premier"
        href="/contact"
        wide
      />
    </main>
  );
}
