"use client";

import Image from "next/image";
import Link from "next/link";
import { RollLabel } from "@/components/ui/RollLabel";
import { useState, type CSSProperties, type KeyboardEvent } from "react";
import type { CloserLookSlide } from "./closer-look-slides";
import styles from "./closer-look.module.css";

function Arrow({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path
        d={direction === "next" ? "M3 8h10M9 4l4 4-4 4" : "M13 8H3m4-4L3 8l4 4"}
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Four-step buyer-guidance panel. One dark surface carries the copy; the photography is
 * cut into it by an angled mask. The panel size is fixed, so changing slides never moves
 * the layout.
 */
export function CloserLook({ slides }: { slides: CloserLookSlide[] }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  function go(next: number) {
    setIndex((next + count) % count);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") go(index + 1);
    else if (event.key === "ArrowLeft") go(index - 1);
  }

  // Only the current image and its neighbours are mounted, so the rest never load early.
  const isNear = (i: number) =>
    (i - index + count) % count <= 1 || (index - i + count) % count <= 1;

  return (
    <section className={styles.section} aria-labelledby="closer-look-heading">
      <div className={styles.container}>
        <p className={styles.eyebrow}>A closer look</p>
        <div className={styles.header}>
          <h2 id="closer-look-heading" className={styles.heading}>
            <span>What makes a home</span> <span>worth a closer look.</span>
          </h2>
          <Link href="/book-viewing" className={`${styles.book} cta`}>
            <RollLabel>Book a viewing</RollLabel>
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </Link>
        </div>

        <div
          className={styles.panel}
          role="region"
          aria-roledescription="carousel"
          aria-label="What to look for in a home"
          onKeyDown={handleKeyDown}
        >
          <div className={styles.media}>
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                className={styles.mediaSlide}
                data-active={i === index}
              >
                {isNear(i) ? (
                  <Image
                    src={slide.image}
                    alt={i === index ? slide.alt : ""}
                    fill
                    sizes="(max-width: 1023px) 100vw, 56vw"
                    style={
                      {
                        "--op": slide.objectPosition,
                        "--op-mobile":
                          slide.mobileObjectPosition ?? slide.objectPosition,
                      } as CSSProperties
                    }
                  />
                ) : null}
              </div>
            ))}
          </div>

          <div className={styles.content}>
            <div className={styles.progress} aria-hidden="true">
              <span className={styles.step}>
                {pad(index + 1)}
                <span> / {pad(count)}</span>
              </span>
              <span className={styles.bars}>
                {slides.map((slide, i) => (
                  <span key={slide.id} data-active={i === index} />
                ))}
              </span>
            </div>

            <div className={styles.stage}>
              {slides.map((slide, i) => (
                <div
                  key={slide.id}
                  className={styles.slide}
                  data-active={i === index}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${count}`}
                  aria-hidden={i !== index}
                  inert={i !== index}
                >
                  <p className={styles.label}>{slide.label}</p>
                  <h3 className={styles.title}>{slide.headline}</h3>
                  <p className={styles.description}>{slide.description}</p>
                </div>
              ))}
            </div>

            <p className="visually-hidden" aria-live="polite">
              {slides[index].label}: {slides[index].headline} ({index + 1} of {count})
            </p>

            <div className={styles.controls}>
              <button
                type="button"
                className={styles.control}
                aria-label="Previous step"
                onClick={() => go(index - 1)}
              >
                <Arrow direction="previous" />
              </button>
              <button
                type="button"
                className={styles.control}
                aria-label="Next step"
                onClick={() => go(index + 1)}
              >
                <Arrow direction="next" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
