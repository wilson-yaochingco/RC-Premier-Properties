"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import exterior from "@/assets/site/home-hero-1.png";
import styles from "./introduction.module.css";
import { ScrollFillText } from "./ScrollFillText";
import { useScrollFill } from "./use-scroll-fill";

const LINES = [
  "We help buyers and sellers across Pampanga",
  "find the right property, understand its value,",
  "and move forward with confidence.",
];
const HEADING = LINES.join(" ");

export function HomeIntroduction() {
  const sectionRef = useRef<HTMLElement>(null);
  const { ref: headingRef, active: scrub } = useScrollFill<HTMLHeadingElement>();
  const [reveal, setReveal] = useState("visible");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setReveal("visible");
        observer.disconnect();
      },
      { threshold: 0.12 },
    );
    setReveal("pending");
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      data-reveal={reveal}
      data-scrub={scrub ? "on" : "off"}
      aria-labelledby="intro-heading"
    >
      <div className={styles.container}>
        <p className={styles.eyebrow}>A clearer way to find home</p>
        <h2
          id="intro-heading"
          ref={headingRef}
          className={styles.heading}
          aria-label={HEADING}
        >
          <ScrollFillText lines={LINES} lineClassName={styles.line} />
        </h2>
        <div className={styles.copy}>
          <p>
            With local market knowledge and clear, honest guidance, we simplify the
            search and keep the focus on the details that matter. From the first viewing
            to turnover, we help you cut through the noise, avoid common pitfalls, and
            decide with confidence.
          </p>
        </div>
        <figure className={styles.figure}>
          <div className={styles.frame}>
            <Image
              src={exterior}
              alt="Contemporary residential exterior with a charcoal roof, timber entrance and landscaped frontage"
              fill
              sizes="(max-width: 1440px) 94vw, 1360px"
              className={styles.image}
            />
          </div>
        </figure>
      </div>
    </section>
  );
}
