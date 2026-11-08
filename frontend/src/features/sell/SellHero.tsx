"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { HomeHeroVideo } from "@/features/home/HomeHeroVideo";
import { RollLabel } from "@/components/ui/RollLabel";
import heroStyles from "@/features/home/hero.module.css";
import styles from "@/app/sell/sell.module.css";

gsap.registerPlugin(useGSAP);

const SELL_HERO_VIDEO = "/media/sell-hero.mp4";

export function SellHero() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .fromTo(
            "[data-sell-line]",
            { yPercent: 115 },
            { yPercent: 0, duration: 1.1, stagger: 0.14 },
            0.15,
          )
          .fromTo(
            "[data-sell-support]",
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.9, clearProps: "opacity,transform" },
            0.9,
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
      data-home-hero
      aria-labelledby="sell-heading"
    >
      <HomeHeroVideo src={SELL_HERO_VIDEO} className={styles.heroVideo} />
      <div className={styles.shade} aria-hidden="true" />
      <div className={heroStyles.cover} data-hero-cover aria-hidden="true" />
      <div className={styles.heroContent} data-hero-layer>
        <h1 id="sell-heading">
          {[
            "Your property,",
            <>
              <em>thoughtfully</em> presented
            </>,
          ].map((line, index) => (
            <span className={styles.line} key={index}>
              <span data-sell-line>{line}</span>
              {index === 0 ? " " : null}
            </span>
          ))}
        </h1>
        <div className={styles.heroSupport} data-sell-support>
          <p>
            From your first inquiry to the next steps, RC Premier helps you explore a
            thoughtful approach to selling your property.
          </p>
          <a className={`${styles.heroAction} cta`} href="#sell-inquiry">
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
    </section>
  );
}
