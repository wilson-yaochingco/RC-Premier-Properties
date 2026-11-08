"use client";

import Image from "next/image";
import Link from "next/link";
import { RollLabel } from "@/components/ui/RollLabel";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
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

/** How long each step stays up before the panel moves on by itself. */
const AUTO_ADVANCE_MS = 7000;
/** Safety net only: how often the watchdog looks, and how far the fill may drift. */
const WATCHDOG_INTERVAL_MS = 1000;
const DRIFT_MS = 400;

/** The progress fill: scaleX 0 -> 1, linear, holding its last frame until cancelled. */
function createFill(fill: HTMLElement): Animation {
  return fill.animate(
    { transform: ["scaleX(0)", "scaleX(1)"] },
    { duration: AUTO_ADVANCE_MS, easing: "linear", fill: "forwards" },
  );
}

/**
 * Four-step buyer-guidance panel. One dark surface carries the copy; on wide screens the
 * photography is cut into it by an angled mask, below that it sits above as a rectangle.
 *
 * Steps advance on their own and the progress line shows it.
 *
 * Timing is a monotonic clock, not the animation. `elapsed` is the time the current step has
 * actually been playing (paused time never counts). While playing, exactly one timeout fires
 * when the remaining time is up, so the step changes on schedule even when the page is
 * rendering slowly or not at all. The Web Animations API fill is only the presentation: it is
 * (re)synced from that clock on every play, pause and watchdog tick, so it can lag a frame
 * but never disagrees for long. Autoplay pauses only for a hidden tab, the section being off
 * screen, or reduced motion; hover and focus have no effect.
 *
 * Every segment's look is derived from the active index alone: earlier segments are done
 * (full), the active one is the timer, later ones are empty. The fill is created in a layout
 * effect so the new active fill is already at 0 before first paint, and the finished one is
 * held at 1 (`fill: forwards`) until that same commit cancels it.
 */
export function CloserLook({ slides }: { slides: CloserLookSlide[] }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const panel = useRef<HTMLDivElement>(null);
  const fills = useRef<Array<HTMLElement | null>>([]);
  const timer = useRef<Animation | null>(null);
  const indexRef = useRef(index);
  // The clock: ms the current step has played, plus when the current play span began.
  const elapsed = useRef(0);
  const playStart = useRef<number | null>(null);
  const timeout = useRef<number | undefined>(undefined);
  // Spoken only after a manual change; automatic changes stay silent.
  const [announcement, setAnnouncement] = useState("");

  // The only things that can turn autoplay off. Hover and focus are deliberately not here.
  const [reducedMotion, setReducedMotion] = useState(true); // off until the client confirms
  const [documentVisible, setDocumentVisible] = useState(true);
  const [sectionVisible, setSectionVisible] = useState(false);
  const shouldPlay = !reducedMotion && documentVisible && sectionVisible;

  // Read by the timer lifecycle so a new timer is born in the right playback state.
  const shouldPlayRef = useRef(shouldPlay);
  useLayoutEffect(() => {
    shouldPlayRef.current = shouldPlay;
    indexRef.current = index;
  });

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () => {
      setDocumentVisible(!document.hidden);
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  // One observer; visibility is always derived from the LATEST entry in a batch, never the
  // first, so a burst of scrolling cannot leave a stale "not visible".
  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const latest = entries[entries.length - 1];
        const visible = latest.isIntersecting && latest.intersectionRatio >= 0.25;
        setSectionVisible(visible);
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const progressNow = () =>
    elapsed.current +
    (playStart.current === null ? 0 : performance.now() - playStart.current);

  function advance() {
    setAnnouncement("");
    setIndex((current) => (current + 1) % count);
  }

  // The single place playback is set. Idempotent: it states the desired state from the
  // clock, never toggles. Playing (re)arms the ONE advance timeout for the time remaining;
  // pausing banks the elapsed time and clears it. The fill follows the clock.
  function setPlaying(play: boolean) {
    const fill = timer.current;
    window.clearTimeout(timeout.current);
    timeout.current = undefined;
    if (play) {
      if (playStart.current === null) playStart.current = performance.now();
      const remaining = Math.max(0, AUTO_ADVANCE_MS - progressNow());
      timeout.current = window.setTimeout(() => {
        advance();
      }, remaining);
      if (fill) {
        fill.currentTime = progressNow();
        fill.play();
      }
    } else {
      if (playStart.current !== null) {
        elapsed.current = progressNow();
        playStart.current = null;
      }
      if (fill) {
        fill.pause();
        fill.currentTime = elapsed.current;
      }
    }
  }

  // A. Lifecycle, tied to the active step only: cancel the old fill, reset the clock to 0,
  // start one new fill from 0, and put both in the right playback state.
  useLayoutEffect(() => {
    elapsed.current = 0;
    playStart.current = null;
    window.clearTimeout(timeout.current);
    timeout.current = undefined;
    const fill = fills.current[index];
    if (reducedMotion) return;
    if (fill && typeof fill.animate === "function") {
      timer.current = createFill(fill);
      timer.current.pause();
      timer.current.currentTime = 0;
    }
    setPlaying(shouldPlayRef.current);
    return () => {
      window.clearTimeout(timeout.current);
      timeout.current = undefined;
      if (timer.current) {
        timer.current.cancel();
        timer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helpers only read refs and `count`
  }, [index, reducedMotion, count]);

  // B. Playback, tied to `shouldPlay` only. It never resets the clock, so progress survives
  // every pause and resume.
  useEffect(() => {
    if (!reducedMotion) setPlaying(shouldPlay);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `setPlaying` reads refs only
  }, [shouldPlay]);

  // C. Watchdog: a low-frequency safety net, only while playback is wanted. It never drives
  // the step. It re-arms a lost timeout, advances if the clock says the step is long overdue,
  // and resyncs the fill to the clock when rendering is stalled, paused or has drifted.
  useEffect(() => {
    if (!shouldPlay) return;
    const interval = window.setInterval(() => {
      const progress = progressNow();
      if (timeout.current === undefined || playStart.current === null) {
        setPlaying(true);
        return;
      }
      if (progress >= AUTO_ADVANCE_MS + 750) {
        advance();
        return;
      }
      const fill = timer.current;
      if (!fill) return;
      const drifted = Math.abs(Number(fill.currentTime ?? -1) - progress) > DRIFT_MS;
      if (
        fill.playState === "paused" ||
        fill.playState === "idle" ||
        fill.pending ||
        drifted
      ) {
        if (fill.playState !== "finished") {
          fill.currentTime = progress;
          fill.play();
        }
      }
    }, WATCHDOG_INTERVAL_MS);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helpers only read refs and `count`
  }, [shouldPlay, count]);

  function go(next: number) {
    const target = (next + count) % count;
    setIndex(target);
    setAnnouncement(
      `${slides[target].label}: ${slides[target].headline} (${target + 1} of ${count})`,
    );
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
        <div className={styles.header} data-motion="sequence">
          <h2
            id="closer-look-heading"
            className={styles.heading}
            data-motion-step="heading"
          >
            <span>What makes a home</span>{" "}
            <span>
              worth a <em>closer look</em>.
            </span>
          </h2>
          <Link
            href="/book-viewing"
            className={`${styles.book} cta cta--wrap`}
            data-motion-step="fade"
            data-motion-at="0.35"
          >
            <RollLabel>Book a viewing</RollLabel>
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </Link>
        </div>

        <div
          ref={panel}
          className={styles.panel}
          data-motion="panel"
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
                    sizes="(max-width: 1024px) 100vw, 56vw"
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
            <div
              className={styles.progress}
              aria-hidden="true"
              data-static={reducedMotion}
            >
              <span className={styles.step}>
                {pad(index + 1)}
                <span> / {pad(count)}</span>
              </span>
              <span className={styles.bars}>
                {slides.map((slide, i) => (
                  <span
                    key={slide.id}
                    data-state={i < index ? "done" : i === index ? "active" : "todo"}
                  >
                    <i
                      className={styles.fill}
                      ref={(element) => {
                        fills.current[i] = element;
                      }}
                    />
                  </span>
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
              {announcement}
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
