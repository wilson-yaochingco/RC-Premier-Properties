"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { RollLabel } from "@/components/ui/RollLabel";
import { plain } from "@/lib/accent";
import exterior from "../../../public/media/properties/photography-v1/brand-new-modern-family-home/brand-new-modern-family-home-exterior-carport.png";
import interior from "../../../public/media/properties/photography-v1/brand-new-modern-family-home/brand-new-modern-family-home-second-floor-common-area.webp";
import { ScrollFillText } from "./ScrollFillText";
import styles from "./sell-statement.module.css";
import { useScrollFill } from "./use-scroll-fill";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STATEMENT_LINES = [
  "Ready to *sell* {exterior} your property?",
  "RC Premier helps you *present* it",
  "beautifully, {interior} reach the right",
  "buyers, and sell with *confidence*.",
];

const PHOTOS = {
  exterior: { src: exterior, position: "50% 10%" },
  interior: { src: interior, position: "50% 55%" },
} satisfies Record<string, { src: StaticImageData; position: string }>;

const INLINE_PHOTOS = Object.fromEntries(
  Object.entries(PHOTOS).map(([key, { src, position }]) => [
    `{${key}}`,
    <span key={key} className={styles.photo} data-sell-photo aria-hidden="true">
      <Image
        src={src}
        alt=""
        fill
        sizes="(max-width: 639px) 90px, 140px"
        style={{ objectPosition: position }}
      />
    </span>,
  ]),
);

const LINE_STAGGER = 0.16;

const LABEL = plain(STATEMENT_LINES.join(" ").replace(/\{\w+\} ?/g, ""));

/** One large editorial sentence, set directly on the page, with a quiet bottom row. */
export function SellStatement() {
  const { ref, active } = useScrollFill<HTMLHeadingElement>();
  const root = useRef<HTMLElement>(null);
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const motion = "(prefers-reduced-motion: no-preference)";
      const media = gsap.matchMedia();
      media.add(
        {
          wide: `(min-width: 64rem) and ${motion}`,
          narrow: `(max-width: 63.99rem) and ${motion}`,
        },
        ({ conditions }) => {
          const line = `.${styles.statementLine}`;
          const lines = gsap.utils.toArray<HTMLElement>(line);
          const timeline = gsap.timeline({
            scrollTrigger: { trigger: container.current, start: "top 80%", once: true },
            defaults: { ease: "power3.out" },
          });
          const settle = { clearProps: "opacity,transform" };

          timeline.fromTo(
            "[data-sell-eyebrow]",
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.9, ...settle },
            0,
          );
          // Narrow screens reflow the lines (display: contents), so the heading rises as one.
          timeline.fromTo(
            conditions?.wide ? lines : ref.current,
            { opacity: 0, y: 28 },
            { opacity: 1, y: 0, duration: 1.1, stagger: LINE_STAGGER, ...settle },
            0.15,
          );
          gsap.utils.toArray<HTMLElement>("[data-sell-photo]").forEach((photo) => {
            const at =
              0.15 +
              lines.indexOf(photo.closest<HTMLElement>(line)!) * LINE_STAGGER +
              0.3;
            timeline
              .fromTo(
                photo,
                { opacity: 0, y: 14, scale: 0.94 },
                { opacity: 1, y: 0, scale: 1, duration: 1, ...settle },
                at,
              )
              .fromTo(
                photo.querySelector("img"),
                { scale: 1.14 },
                { scale: 1, duration: 1.4, clearProps: "transform" },
                at,
              );
          });
          timeline.fromTo(
            "[data-sell-cta]",
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.9, ...settle },
            ">-0.5",
          );
        },
      );
      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className={styles.section}
      data-scrub={active ? "on" : "off"}
      aria-labelledby="sell-statement"
    >
      <div ref={container} className={styles.container}>
        <p className={styles.eyebrow} data-sell-eyebrow>
          Selling your property
        </p>
        <h2
          id="sell-statement"
          ref={ref}
          className={styles.statement}
          aria-label={LABEL}
        >
          <ScrollFillText
            lines={STATEMENT_LINES}
            lineClassName={styles.statementLine}
            inline={INLINE_PHOTOS}
          />
        </h2>

        <div className={styles.footer} data-sell-cta>
          <Link href="/sell" className={`${styles.button} cta cta--wrap`}>
            <RollLabel>Sell your property</RollLabel>
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
