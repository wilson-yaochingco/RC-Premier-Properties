"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Image from "next/image";
import { useRef } from "react";
import { RollLabel } from "@/components/ui/RollLabel";
import Link from "next/link";
import entrance from "@/assets/site/about.png";
import dusk from "@/assets/site/bungalow-exterior.jpg";
import dining from "../../../public/media/properties/photography-v1/brand-new-modern-family-home/brand-new-modern-family-home-staircase.webp";
import aerial from "../../../public/images/locations/angeles-city.jpg";
import living from "@/assets/site/home-hero-3.png";
import garden from "../../../public/media/properties/photography-v1/modern-filipino-smart-home/modern-filipino-smart-home-room-garden-door.webp";
import styles from "./about-places.module.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const PHOTOS = [
  {
    src: entrance,
    shape: "portraitA",
    alt: "Timber-soffit residence seen from the entrance",
  },
  {
    src: dusk,
    shape: "wideA",
    alt: "Modern single-storey home with a dark metal gate and a flat roof",
  },
  {
    src: dining,
    shape: "portraitB",
    alt: "Stairwell with a timber handrail and pendant lights",
  },
  { src: aerial, shape: "wideB", alt: "Angeles City with Mount Arayat on the horizon" },
  {
    src: living,
    shape: "portraitC",
    alt: "Double-height living and dining space with a mezzanine",
  },
  {
    src: garden,
    shape: "wideC",
    alt: "Room opening onto a garden through glazed doors",
  },
] as const;

const CYCLE_SECONDS = { min: 35, max: 50 };
const SPEED_PX_PER_SECOND = 55;
/** How much faster the strip may run while the page scrolls, and how gently it settles. */
const SCROLL_BOOST = { max: 0.4, velocity: 1500, follow: 0.12, settle: 0.5, ramp: 1 };

function PhotoSet({ hidden }: { hidden?: boolean }) {
  return (
    <ul
      className={styles.set}
      aria-hidden={hidden || undefined}
      aria-label={hidden ? undefined : "Homes and places across Pampanga"}
    >
      {PHOTOS.map(({ src, shape, alt }, index) => (
        <li key={shape} className={`${styles.frame} ${styles[shape]}`}>
          <div data-motion-frame={hidden ? undefined : ""} className={styles.photo}>
            <Image
              src={src}
              alt={hidden ? "" : alt}
              fill
              sizes="(max-width: 767px) 70vw, 28vw"
              loading={hidden || index > 2 ? "lazy" : undefined}
              draggable={false}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * A full-bleed filmstrip that drifts right to left. The track holds two identical sets and
 * moves by half its width, so the loop has no seam. It only runs on wide screens without
 * reduced motion; elsewhere it is an ordinary swipeable strip.
 */
export function AboutPlaces() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const toggle = useRef<(() => void) | null>(null);

  useGSAP(
    () => {
      const root = section.current!;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        root.dataset.marquee = "";
        viewport.current!.setAttribute("aria-describedby", "places-hint");
        const set = track.current!.firstElementChild as HTMLElement;
        const cycle = () =>
          gsap.utils.clamp(
            CYCLE_SECONDS.min,
            CYCLE_SECONDS.max,
            set.offsetWidth / SPEED_PX_PER_SECOND,
          );
        const loop = gsap.to(track.current, {
          xPercent: -50,
          duration: cycle(),
          ease: "none",
          repeat: -1,
          paused: true,
        });

        // One damped speed multiplier drives the loop: it ramps in and out around pauses
        // and swells slightly with scroll velocity, so the playhead never jumps.
        let inView = false;
        let userPaused = false;
        let ramp = 0;
        let boost = 1;
        let velocity = 0;
        let lastY = window.scrollY;
        const follow = (rate: number, dt: number) => 1 - Math.exp(-dt / rate);
        const tick = (_time: number, deltaMs: number) => {
          const dt = Math.min(deltaMs, 100) / 1000 || 0.016;
          const y = window.scrollY;
          velocity +=
            (Math.max(y - lastY, 0) / dt - velocity) * follow(SCROLL_BOOST.follow, dt);
          lastY = y;
          const target =
            1 + SCROLL_BOOST.max * Math.min(1, velocity / SCROLL_BOOST.velocity);
          boost += (target - boost) * follow(SCROLL_BOOST.settle, dt);
          const wanted = inView && !userPaused ? 1 : 0;
          ramp += (wanted - ramp) * follow(SCROLL_BOOST.ramp, dt);
          if (!wanted && ramp < 0.002) {
            ramp = 0;
            loop.pause();
            gsap.ticker.remove(tick);
            return;
          }
          loop.timeScale(ramp * boost).resume();
        };
        const sync = () => {
          gsap.ticker.remove(tick);
          lastY = window.scrollY;
          gsap.ticker.add(tick);
        };
        const trigger = ScrollTrigger.create({
          trigger: root,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            inView = self.isActive;
            sync();
          },
        });
        const resize = new ResizeObserver(() => {
          const progress = loop.progress();
          loop.duration(cycle()).progress(progress);
        });
        resize.observe(set);
        toggle.current = () => {
          userPaused = !userPaused;
          sync();
        };
        return () => {
          gsap.ticker.remove(tick);
          resize.disconnect();
          trigger.kill();
          loop.kill();
          toggle.current = null;
          delete root.dataset.marquee;
          viewport.current?.removeAttribute("aria-describedby");
        };
      });
    },
    { scope: section },
  );

  return (
    <section
      ref={section}
      className={styles.section}
      aria-labelledby="places-heading"
      data-motion="sequence"
    >
      <div className={styles.intro}>
        <h2 id="places-heading" data-motion-step="heading">
          <span>
            Rooted in the <em>places</em> we know,
          </span>{" "}
          <span>guided by local understanding,</span>{" "}
          <span>
            focused on the <em>people</em> we serve
          </span>
        </h2>
        <div className={styles.aside}>
          <p data-motion-step="fade" data-motion-at="0.35">
            From familiar neighborhoods to thoughtfully chosen homes, our connection to
            Pampanga shapes how we help people find their next place.
          </p>
          <Link
            href="/locations"
            className={`${styles.link} cta`}
            data-motion-step="fade"
            data-motion-at="0.5"
          >
            <RollLabel>Explore Locations</RollLabel>
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </Link>
        </div>
      </div>
      <div
        ref={viewport}
        className={styles.viewport}
        data-motion="photos"
        data-motion-stagger="0.12"
        role="group"
        aria-label="Photographs of homes and places across Pampanga"
        aria-keyshortcuts="Space"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === " " && toggle.current) {
            event.preventDefault();
            toggle.current();
          }
        }}
      >
        <div ref={track} className={styles.track}>
          <PhotoSet />
          <PhotoSet hidden />
        </div>
      </div>
      <span id="places-hint" hidden>
        Press space to pause or resume the movement.
      </span>
    </section>
  );
}
