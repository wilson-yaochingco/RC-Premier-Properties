"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import exterior from "@/assets/site/home-hero-1.png";
import styles from "./introduction.module.css";

export function HomeIntroduction() {
  const sectionRef = useRef<HTMLElement>(null);
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
      aria-labelledby="intro-heading"
    >
      <div className={styles.container}>
        <p className={styles.eyebrow}>A clearer way to find home</p>
        <div className={styles.editorial}>
          <h2 id="intro-heading" className={styles.heading}>
            Not every house
            <br /> feels like the right one.
          </h2>
          <div className={styles.copy}>
            <p>
              Explore homes across Pampanga with the details that matter before you
              decide what to see in person.
            </p>
            <Link href="/locations" className={styles.link}>
              <span>Explore locations</span>
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </Link>
          </div>
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
          <figcaption className={styles.caption}>
            <span>Architectural perspective</span>
            <span className={styles.rule} aria-hidden="true" />
            <span>Residential</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
