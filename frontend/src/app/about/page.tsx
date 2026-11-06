import Image from "next/image";
import exterior from "@/assets/site/home-hero-1.png";
import interior from "@/assets/site/properties.png";
import leftExterior from "@/assets/site/footer.png";
import architecturalDetail from "@/assets/site/why-rc-premier.png";
import poolside from "@/assets/site/home-hero-2.png";
import portrait from "@/assets/site/location.png";
import aboutImage from "@/assets/site/about.png";
import heroImage from "@/assets/site/home_hero.jpg";
import frame from "@/components/layout/editorial-page.module.css";
import { EditorialCta } from "@/components/ui/EditorialCta";
import { AboutGallery } from "@/features/about/AboutGallery";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import styles from "./about.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "About",
  description:
    "Learn how RC Premier Properties helps people discover residential properties across Pampanga and move from search to a direct conversation.",
  canonicalPath: "/about",
  imagePath: aboutImage.src,
});

export default function AboutPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`${frame.page} ${frame.flush} ${styles.page}`}
    >
      <section className={styles.hero} data-about-hero aria-labelledby="about-heading">
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroContent}>
          <div>
            <h1 id="about-heading">
              Rooted in Pampanga. <br />
              Focused on your move. <br className={styles.desktopBreak} />
              Here for what&apos;s next.
            </h1>
          </div>
          <p className={styles.heroLede}>
            Residential properties, thoughtful presentation, and direct guidance for
            people buying or selling across Pampanga.
          </p>
        </div>
      </section>
      <section className={styles.who} aria-labelledby="who-heading">
        <div className={styles.statement}>
          <p className={styles.eyebrow}>Who we are</p>
          <h2 id="who-heading">
            Thoughtfully presented homes, clearer property decisions, and a more
            personal way forward in Pampanga.
          </h2>
          <p>
            RC Premier Properties brings together residential homes, thoughtful
            presentation, and clear property information across Pampanga. Through local
            context and direct conversations, we help buyers and sellers better
            understand their options and take the next step.
          </p>
        </div>
        <div className={styles.mosaic}>
          <figure className={styles.mosaicLeft}>
            <Image
              src={leftExterior}
              alt="Contemporary residence with timber cladding and a white boundary wall"
              fill
              sizes="(max-width: 767px) 50vw, 33vw"
            />
          </figure>
          <figure className={styles.mosaicDetail}>
            <Image
              src={architecturalDetail}
              alt="Double-height entrance with warm timber and a sculptural pendant light"
              fill
              sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 17vw"
            />
          </figure>
          <figure className={styles.mosaicMain}>
            <Image
              src={exterior}
              alt="Contemporary residence with a sloping charcoal roof and planted frontage"
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 100vw, 42vw"
            />
          </figure>
          <figure className={styles.mosaicRight}>
            <Image
              src={poolside}
              alt="Residence with a pool and balcony beneath a bright sky"
              fill
              sizes="(max-width: 767px) 50vw, (max-width: 1023px) 50vw, 25vw"
            />
          </figure>
          <figure className={styles.mosaicLower}>
            <Image
              src={interior}
              alt="Living area with warm timber flooring and a sculptural staircase"
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 42vw"
            />
          </figure>
          <figure className={styles.mosaicPortrait}>
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
        <h2 id="drives-heading">
          Thoughtful <br className={styles.drivesBreak} />
          homes, clearer <br className={styles.drivesBreak} />
          decisions
        </h2>
        <article className={styles.row}>
          <h3>Our perspective</h3>
          <p>
            RC Premier&apos;s residential work emphasizes thoughtful planning, modern
            architecture, and attention to everyday living.
          </p>
        </article>
        <article className={styles.row}>
          <h3>Our approach</h3>
          <p>
            Clear property information, useful location context, and direct follow-up
            help buyers and sellers understand their options and discuss the next step.
          </p>
        </article>
      </section>
      <AboutGallery />
      <EditorialCta
        id="about-cta-heading"
        eyebrow="Your next move"
        headline={["Every next step starts", "with a conversation."]}
        body="Explore your options with RC Premier Properties."
        label="Talk to RC Premier"
        href="/contact"
        wide
      />
    </main>
  );
}
