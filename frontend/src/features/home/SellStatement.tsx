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

const LABEL = plain(STATEMENT_LINES.join(" ").replace(/\{\w+\} ?/g, ""));

/** One large editorial sentence, set directly on the page, with a quiet bottom row. */
export function SellStatement() {
  const { ref, active } = useScrollFill<HTMLHeadingElement>();
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({
            scrollTrigger: { trigger: ref.current, start: "top 75%", once: true },
            defaults: { ease: "power3.out" },
          })
          .fromTo(
            "[data-sell-photo]",
            { opacity: 0, y: 14, scale: 0.94 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 1,
              stagger: 0.22,
              clearProps: "opacity,transform",
            },
          )
          .fromTo(
            "[data-sell-photo] img",
            { scale: 1.14 },
            { scale: 1, duration: 1.4, stagger: 0.22, clearProps: "transform" },
            0,
          );
      });
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
      <div className={styles.container}>
        <p className={styles.eyebrow}>Selling your property</p>
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

        <div className={styles.footer}>
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
