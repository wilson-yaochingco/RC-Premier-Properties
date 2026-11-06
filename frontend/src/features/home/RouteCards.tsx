import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { RouteRail } from "./RouteRail";
import { SwipeIndicator } from "./SwipeIndicator";
import styles from "./route-cards.module.css";

// Source images are social exports with a top-left watermark and a bottom contact
// strip. x0 positions the crop window (fraction of image width) clear of both;
// with clean originals, drop the crop vars in the stylesheet.
const CARDS = [
  {
    title: "Buy a home",
    copy: "Browse available homes and residential properties across Pampanga.",
    href: "/properties",
    image: "/images/home/section-three/buy-a-home.jpg",
    x0: 0.12,
  },
  {
    title: "Book a viewing",
    copy: "Found something promising? Schedule a viewing and see the property in person.",
    href: "/book-viewing",
    image: "/images/home/section-three/book-a-viewing.jpg",
    x0: 0.12,
  },
  {
    title: "Explore details",
    copy: "Take a closer look at interiors, finishes, and architectural features that matter.",
    href: "/properties",
    image: "/images/home/section-three/explore-details.jpg",
    x0: 0.1,
  },
  {
    title: "Sell a property",
    copy: "Start a straightforward conversation about listing and marketing your property.",
    href: "/sell",
    image: "/images/home/section-three/sell-a-property.png",
    x0: 0.1,
  },
];

export function RouteCards() {
  return (
    <section className={styles.section} aria-labelledby="routes-heading">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 id="routes-heading" className={styles.heading}>
            Start with what you need.
          </h2>
          <p className={styles.lede}>
            Whether you are searching, comparing, or preparing to sell, begin with the
            path that fits you best.
          </p>
        </div>
        <RouteRail>
          {CARDS.map((card, i) => (
            <li key={card.title}>
              <Link
                href={card.href}
                className={styles.card}
                aria-labelledby={`route-title-${i}`}
                aria-describedby={`route-copy-${i}`}
                style={{ "--x0-desktop": card.x0 } as CSSProperties}
              >
                <Image
                  src={card.image}
                  alt=""
                  width={1536}
                  height={2048}
                  sizes="(max-width: 40rem) 100vw, (max-width: 64rem) 50vw, 25vw"
                  className={styles.image}
                />
                <span className={styles.shade} aria-hidden="true" />
                <span className={styles.panel} aria-hidden="true" />
                <svg
                  aria-hidden="true"
                  className={styles.arrow}
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
                <span className={styles.body}>
                  <span id={`route-title-${i}`} className={styles.title}>
                    {card.title}
                  </span>
                  <span className={styles.copyWrap}>
                    <span id={`route-copy-${i}`} className={styles.copy}>
                      {card.copy}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </RouteRail>
        <SwipeIndicator railId="route-rail" count={CARDS.length} />
      </div>
    </section>
  );
}
