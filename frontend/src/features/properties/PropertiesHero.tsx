"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { HomeHeroVideo } from "@/features/home/HomeHeroVideo";
import styles from "./property-catalog.module.css";

gsap.registerPlugin(useGSAP);

export function PropertiesHero({ children }: { children: ReactNode }) {
  const hero = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
        timeline
          .fromTo("[data-hero-backdrop]", { scale: 1.045 }, { scale: 1, duration: 1.8 })
          .fromTo(
            "[data-hero-line] > span",
            { yPercent: 110 },
            { yPercent: 0, duration: 1.2, stagger: 0.14 },
            0.15,
          )
          .fromTo(
            "[data-hero-search]",
            { opacity: 0, y: 18 },
            { opacity: 1, y: 0, duration: 0.9, clearProps: "opacity,transform" },
            0.65,
          );
      });
      return () => mm.revert();
    },
    { scope: hero },
  );

  return (
    <section
      ref={hero}
      className={styles.hero}
      data-properties-hero
      aria-labelledby="properties-heading"
    >
      <div className={styles.heroBackdrop} data-hero-backdrop>
        <HomeHeroVideo src="/media/properties-hero.mp4" className={styles.heroVideo} />
      </div>
      <div className={styles.heroContent}>
        <h1 id="properties-heading" className={styles.heroHeadline}>
          <span data-hero-line>
            <span>Find your next</span>
          </span>{" "}
          <span data-hero-line>
            <span>
              <em>home</em> in Pampanga
            </span>
          </span>
        </h1>
        <div className={styles.heroSearch} data-hero-search>
          {children}
        </div>
      </div>
    </section>
  );
}
