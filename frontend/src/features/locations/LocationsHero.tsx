"use client";

import { ScrollFillText } from "@/features/home/ScrollFillText";
import { useScrollFill } from "@/features/home/use-scroll-fill";
import { HomeHeroVideo } from "@/features/home/HomeHeroVideo";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import heroStyles from "@/features/home/hero.module.css";
import { plain } from "@/lib/accent";
import styles from "./locations-index.module.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function LocationsHero() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
        timeline
          .fromTo(
            "[data-location-line]",
            { yPercent: 125 },
            { yPercent: 0, duration: 1.1, stagger: 0.12 },
            0.15,
          )
          .fromTo(
            "[data-location-backdrop]",
            { scale: 1.045 },
            { scale: 1, duration: 1.8 },
            0,
          )
          .fromTo(
            "[data-location-lede]",
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.8, clearProps: "opacity,transform" },
            1,
          );
      });
      return () => media.revert();
    },
    { scope: root },
  );
  return (
    <section
      ref={root}
      className={styles.hero}
      data-locations-hero
      data-home-hero
      aria-labelledby="locations-title"
    >
      <div className={styles.heroBackdrop} data-location-backdrop>
        <HomeHeroVideo src="/media/locations-hero.mp4" className={styles.heroVideo} />
      </div>
      <div className={heroStyles.cover} data-hero-cover aria-hidden="true" />
      <h1 id="locations-title" className={styles.heroTitle} data-hero-layer>
        {[
          <>
            Find the right <em>place</em>
          </>,
          "for your next",
          "home in Pampanga",
        ].map((line, index) => (
          <span className={styles.heroLine} key={index}>
            <span data-location-line>{line}</span>
            {index < 2 ? " " : null}
          </span>
        ))}
      </h1>
      <p className={styles.heroLede} data-location-lede data-hero-layer>
        Explore communities across Pampanga and discover the places that fit your
        lifestyle, priorities, and next move.
      </p>
    </section>
  );
}

const STATEMENT_LINES = [
  "Finding the right *home* begins with",
  "understanding the places and *people*",
  "and the everyday moments that make",
  "a *community* feel like home to you",
];

export function LocationsStatement() {
  const { ref: headingRef, active } = useScrollFill<HTMLHeadingElement>();
  return (
    <section
      className={styles.statement}
      data-scrub={active ? "on" : "off"}
      aria-labelledby="locations-statement-title"
    >
      <p className={styles.eyebrow}>Exploring Pampanga</p>
      <h2
        id="locations-statement-title"
        ref={headingRef}
        aria-label={plain(STATEMENT_LINES.join(" "))}
      >
        <ScrollFillText
          lines={STATEMENT_LINES}
          lineClassName={styles.statementFillLine}
        />
      </h2>
    </section>
  );
}

export function LocationsGuidance() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({
            scrollTrigger: { trigger: root.current, start: "top 82%", once: true },
            defaults: { ease: "power3.out" },
          })
          .fromTo(
            "h2",
            { opacity: 0, y: 18 },
            { opacity: 1, y: 0, duration: 1, clearProps: "opacity,transform" },
            0,
          )
          .fromTo(
            "[data-guide-row-content]",
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.9, stagger: 0.15 },
            0.35,
          );
      });
      return () => media.revert();
    },
    { scope: root },
  );
  return (
    <section
      ref={root}
      className={styles.guidance}
      aria-labelledby="locations-guidance-title"
    >
      <h2 id="locations-guidance-title">
        <span>Find a place</span> <span>that fits the</span>{" "}
        <span>
          way you <em>live</em>
        </span>
      </h2>
      <div className={styles.guidanceRows}>
        {[
          ["Everyday", "accessibility"],
          ["Different community", "lifestyles"],
          ["Guidance for", "your next move"],
        ].map(([first, second], index) => (
          <article key={first}>
            <div className={styles.guidanceRowContent} data-guide-row-content>
              <span className={styles.guidanceNumber}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>
                <span>{first}</span> <span>{second}</span>
              </h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
