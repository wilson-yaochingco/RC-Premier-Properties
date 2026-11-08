"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import exterior from "@/assets/site/footer.png";
import interior from "@/assets/site/properties.png";
import courtyard from "@/assets/site/home-hero-2.png";
import { plain } from "@/lib/accent";
import styles from "./introduction.module.css";
import { ScrollFillText } from "./ScrollFillText";
import { useScrollFill } from "./use-scroll-fill";

const LINES = [
  "We help buyers and sellers across *Pampanga*",
  "find the right *property*, understand its value,",
  "and move forward with *confidence*.",
];
const HEADING = plain(LINES.join(" "));
const PHOTOGRAPHS = [
  {
    src: exterior,
    alt: "Contemporary residence with timber cladding and a white boundary wall",
    position: "50% 35%",
    title: "Architecture that stands out",
    text: "Explore homes with distinctive architecture and thoughtful details that make each property worth discovering.",
  },
  {
    src: interior,
    alt: "Living area with warm timber flooring and a sculptural staircase",
    position: "50% 50%",
    title: "Spaces made for living",
    text: "Look beyond the floor plan and discover interiors, layouts, and finishes suited to everyday living.",
  },
  {
    src: courtyard,
    alt: "Courtyard pool beside a residence with a glass balcony",
    position: "50% 60%",
    title: "More than four walls",
    text: "From outdoor spaces to the surrounding environment, discover the details that shape the experience of home.",
  },
] as const;

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
        <div className={styles.figure} data-motion="photos">
          {PHOTOGRAPHS.map((photo) => (
            <figure key={photo.title} className={styles.item}>
              <div className={styles.frame} data-motion-frame>
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 767px) 94vw, (max-width: 1920px) 31vw, 600px"
                  className={styles.image}
                  style={{ objectPosition: photo.position }}
                />
              </div>
              <figcaption className={styles.caption}>
                <h3>{photo.title}</h3>
                <p>{photo.text}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
