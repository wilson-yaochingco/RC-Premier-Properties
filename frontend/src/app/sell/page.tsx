import type { Metadata } from "next";
import Image from "next/image";
import architecture from "@/assets/site/properties.png";
import exterior from "@/assets/site/location.png";
import livingRoom from "@/assets/site/home-hero-3.png";
import garden from "@/assets/site/book-viewing.png";
import ogImage from "@/assets/site/home-hero-1.png";
import frame from "@/components/layout/editorial-page.module.css";
import { EditorialCta } from "@/components/ui/EditorialCta";
import { RollLabel } from "@/components/ui/RollLabel";
import { PageMotion } from "@/components/layout/PageMotion";
import { HomeHeroCover } from "@/features/home/HomeHeroCover";
import { InquiryForm } from "@/features/inquiries/InquiryForm";
import {
  PreparationIcon,
  type PreparationIconName,
} from "@/features/sell/PreparationIcon";
import { SellHero } from "@/features/sell/SellHero";
import { buildPageMetadata } from "@/lib/seo";
import styles from "./sell.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Sell Your Property in Pampanga",
  description:
    "Start a direct conversation with RC Premier Properties about selling a residential property in Pampanga. An inquiry is not a valuation or listing agreement.",
  canonicalPath: "/sell",
  imagePath: ogImage.src,
});

const PREPARATION: { label: string; icon: PreparationIconName }[] = [
  { label: "Property address or general location", icon: "location" },
  { label: "Property type and key features", icon: "home" },
  { label: "Approximate lot and floor area, if known", icon: "area" },
  { label: "Current property condition", icon: "condition" },
  { label: "Ownership or authorization details, if applicable", icon: "ownership" },
  { label: "Preferred asking price, if decided", icon: "price" },
  { label: "Available photographs or viewing details", icon: "photos" },
  { label: "Preferred selling timeline, if any", icon: "timeline" },
];
const GALLERY = [
  {
    src: exterior,
    alt: "Modern residence with a timber-clad canopy and stone-faced facade",
    position: "50% 40%",
    title: "Architecture that stands out",
    text: "Thoughtful architecture and distinctive details help a property make a memorable first impression.",
  },
  {
    src: livingRoom,
    alt: "Bright double-height living area with a timber coffee table and open mezzanine",
    position: "50% 55%",
    title: "Spaces made for living",
    text: "Present interiors, layouts, and finishes in a way that helps potential buyers understand the home.",
  },
  {
    src: garden,
    alt: "Landscaped garden with a pebble path beside a white boundary wall",
    position: "50% 60%",
    title: "Details that make a difference",
    text: "Highlight the features and outdoor spaces that make each property distinctive.",
  },
] as const;

export default function SellPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`${frame.page} ${frame.flush} ${styles.page}`}
      data-layered-hero
    >
      <PageMotion />
      <HomeHeroCover />
      <SellHero />
      <div data-home-hero-end aria-hidden="true" />

      <section className={styles.preparation} aria-labelledby="preparation-heading">
        <div className={styles.preparationCopy}>
          <div>
            <h2
              id="preparation-heading"
              className={styles.sectionTitle}
              data-motion="fade"
            >
              A thoughtful start to <em>selling</em>
            </h2>
            <p className={styles.intro} data-motion="fade">
              A few details can help begin a useful conversation. Prepare what you know,
              at your own pace.
            </p>
          </div>
          <ul className={styles.checklist} data-motion="group">
            {PREPARATION.map((item) => (
              <li key={item.label}>
                <PreparationIcon name={item.icon} />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
          <div className={styles.preparationFooter} data-motion="fade">
            <p className={styles.note}>
              This is preparation guidance, not a list of required documents. Please do
              not upload sensitive documents through the form.
            </p>
            <a className={`${styles.sectionAction} cta cta--wrap`} href="#sell-inquiry">
              <RollLabel>Tell us about your property</RollLabel>
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
              >
                <path d="M4 4l10 10M5 14h9V5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </a>
          </div>
        </div>
        <div className={styles.photograph} data-motion="photos">
          <figure data-motion-frame>
            <Image
              src={architecture}
              alt="Warm timber living space with a sculptural staircase and generous natural light"
              fill
              sizes="(max-width: 767px) 100vw, 48vw"
            />
          </figure>
        </div>
      </section>

      <section className={styles.gallery} aria-labelledby="gallery-heading">
        <h2 id="gallery-heading" className={styles.galleryTitle} data-motion="fade">
          Every property has a <em>story</em> worth presenting well
        </h2>
        <div className={styles.galleryGrid} data-motion="photos">
          {GALLERY.map((photo) => (
            <figure key={photo.title} className={styles.galleryItem}>
              <div className={styles.galleryFrame} data-motion-frame>
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 767px) 94vw, 31vw"
                  style={{ objectPosition: photo.position }}
                />
              </div>
              <figcaption>
                <h3>{photo.title}</h3>
                <p>{photo.text}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section
        id="sell-inquiry"
        className={styles.inquiry}
        aria-labelledby="seller-inquiry-heading"
      >
        <div className={styles.inquiryHeader} data-motion="fade">
          <h2 id="seller-inquiry-heading" className={styles.sectionTitle}>
            Let&apos;s talk about your <em>property</em>
          </h2>
          <p className={styles.intro}>
            Tell us a little about your property and what you have in mind.
          </p>
        </div>
        <div className={styles.formArea} data-motion="fade">
          <InquiryForm
            variant="seller"
            defaultInquiryType="selling"
            source="sell-page"
            submitLabel="Send seller inquiry"
          />
        </div>
      </section>

      <EditorialCta
        id="sell-cta-heading"
        eyebrow="Ready when you are"
        headline={["Tell us about", "your *property*."]}
        body="A few details are enough to begin the conversation."
        label="Start your inquiry"
        href="#sell-inquiry"
        wide
      />
    </main>
  );
}
