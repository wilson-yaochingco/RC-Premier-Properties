"use client";

import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import { isMotionGateHydrated } from "./MotionHydrated";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin);

/** Shared motion tokens. Entrances run once, on ease-out curves, from a small offset. */
const EASE = "expo.out";
const START = "top 86%";
const DURATION = { heading: 1, panel: 1, fade: 0.8, item: 0.8 };
const STAGGER = { lines: 0.12, items: 0.1, photos: 0.3 };
const stagger = (el: HTMLElement, fallback: number) =>
  Number(el.dataset.motionStagger ?? fallback);
// Photographs: a slow unveil, the image settling inside its mask; captions land near the end.
const PHOTO = { duration: 1.5, ease: "power3.inOut", settle: 1.06, caption: 0.95 };
// The house is drawn element by element over this window, then rests.
const HOUSE = { draw: 0.55, spread: 1.15 };

type Reveal = () => gsap.core.Animation;

/**
 * Scroll-triggered entrances for any element in `<main>` marked `data-motion`:
 * `heading` (masked line rise), `fade`, `panel`, `group` (staggered children) and `photos`
 * (clip reveal with captions), or a `sequence` whose `data-motion-step` children share one
 * timeline. Elements already in view, or above it, are never hidden, and content is only
 * hidden here, in script, so nothing stays invisible if this fails. Elements are picked up
 * as they mount (streamed content included) and each reveals once.
 */
export function PageMotion() {
  // Lenis moves the real window scroll; ScrollTrigger only needs to be told it moved.
  useLenis(() => ScrollTrigger.update());

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        compact: "(max-width: 47.99rem)",
        wide: "(min-width: 75rem)",
      },
      (context) => {
        if (!context.conditions?.motion) return;
        const compact = Boolean(context.conditions.compact);
        const wide = Boolean(context.conditions.wide);
        const cleanups: (() => void)[] = [];
        const rise = compact ? 16 : 24;
        const main = document.querySelector("main");
        if (!main) return;

        let ready = false;
        let frame: number | undefined;

        const prepare = (el: HTMLElement, type: string): Reveal | undefined => {
          if (type === "heading") {
            // SplitText measures lines from inline-block words, which run a little wider than
            // the live text and can add a line to a tight heading. It is measured with a
            // sliver of slack, and the lines are pinned, so the split never wraps differently
            // from the heading it will revert to.
            const build = () => {
              const width = el.getBoundingClientRect().width;
              Object.assign(el.style, {
                width: `${width * 1.015}px`,
                maxWidth: "none",
              });
              const created = SplitText.create(el, {
                type: "lines",
                mask: "lines",
                maskClass: "motion-mask",
              });
              Object.assign(el.style, { width: "", maxWidth: "" });
              gsap.set(created.lines, { yPercent: 105 });
              // A line that wraps over several rows (very large text) must keep wrapping.
              for (const line of created.lines as HTMLElement[]) {
                const range = document.createRange();
                range.selectNodeContents(line);
                const rows = new Set(
                  [...range.getClientRects()].map((box) => Math.round(box.top)),
                );
                if (rows.size <= 1) line.style.whiteSpace = "nowrap";
              }
              return { created, width };
            };
            let current = build();
            let revealed = false;
            // A resize before the reveal re-measures; the lines are hidden until then.
            let lastWidth = window.innerWidth;
            const onResize = () => {
              if (revealed || window.innerWidth === lastWidth) return;
              lastWidth = window.innerWidth;
              current.created.revert();
              current = build();
            };
            window.addEventListener("resize", onResize);
            cleanups.push(() => window.removeEventListener("resize", onResize));
            return () => {
              revealed = true;
              window.removeEventListener("resize", onResize);
              return gsap.to(current.created.lines, {
                yPercent: 0,
                duration: DURATION.heading,
                ease: EASE,
                stagger: STAGGER.lines,
                onComplete: () => current.created.revert(),
              });
            };
          }
          if (type === "fade" || type === "panel") {
            const distance = type === "panel" ? rise + 8 : rise;
            // A small sideways drift toward the centre, only where the cards flank a drawing.
            const x = wide ? Number(el.dataset.motionX ?? 0) : 0;
            gsap.set(el, { opacity: 0, y: distance, x });
            return () =>
              gsap.to(el, {
                opacity: 1,
                y: 0,
                x: 0,
                duration: type === "panel" ? DURATION.panel : DURATION.fade,
                ease: EASE,
                clearProps: "opacity,transform",
              });
          }
          if (type === "group") {
            const items = [...el.children].filter(
              (child) => getComputedStyle(child).display !== "none",
            );
            gsap.set(items, { opacity: 0, y: rise });
            return () =>
              gsap.to(items, {
                opacity: 1,
                y: 0,
                duration: DURATION.item,
                ease: EASE,
                stagger: stagger(el, STAGGER.items),
                clearProps: "opacity,transform",
              });
          }
          if (type === "photos") {
            const frames = [...el.querySelectorAll<HTMLElement>("[data-motion-frame]")];
            const captions = [...el.querySelectorAll<HTMLElement>("figcaption")];
            const images = frames.map((frame) => frame.querySelector("img"));
            // `data-motion-reveal="fade"` swaps the downward clip wipe for a plain fade.
            const fade = el.dataset.motionReveal === "fade";
            gsap.set(frames, fade ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" });
            gsap.set(images, { scale: fade ? 1.03 : PHOTO.settle });
            if (captions.length) gsap.set(captions, { opacity: 0, y: rise });
            return () => {
              const timeline = gsap.timeline();
              frames.forEach((frame, i) => {
                const at = i * stagger(el, STAGGER.photos);
                timeline.to(
                  frame,
                  fade
                    ? {
                        opacity: 1,
                        duration: PHOTO.duration,
                        ease: "power2.out",
                        clearProps: "opacity",
                      }
                    : {
                        clipPath: "inset(0 0 0% 0)",
                        duration: PHOTO.duration,
                        ease: PHOTO.ease,
                        clearProps: "clipPath",
                      },
                  at,
                );
                timeline.to(
                  images[i],
                  {
                    scale: 1,
                    duration: PHOTO.duration + 0.4,
                    ease: "power2.out",
                    clearProps: "transform",
                  },
                  at,
                );
                if (captions[i])
                  timeline.to(
                    captions[i],
                    {
                      opacity: 1,
                      y: 0,
                      duration: DURATION.fade,
                      ease: EASE,
                      clearProps: "opacity,transform",
                    },
                    at + PHOTO.caption,
                  );
              });
              return timeline;
            };
          }
          if (type === "house") {
            const img = el as HTMLImageElement;
            gsap.set(img, { clipPath: "inset(100% 0 0 0)" });
            const unveil = () =>
              gsap.to(img, {
                clipPath: "inset(0% 0 0 0)",
                duration: 1.6,
                ease: "power2.inOut",
                clearProps: "clipPath",
              });
            if (compact) return unveil;
            // Draw the real drawing: fetch the same SVG, place it over the image, and trace each
            // line and face in the file's own (back-to-front) order. Until it is ready, or if it
            // fails, the image itself is unveiled from the ground up.
            let svg: SVGSVGElement | undefined;
            let started = false;
            fetch(img.currentSrc || img.src)
              .then((response) => response.text())
              .then((text) => {
                if (started) return;
                const doc = new DOMParser().parseFromString(text, "image/svg+xml");
                const parsed = doc.documentElement as unknown as SVGSVGElement;
                if (!parsed.querySelector("line, path")) return;
                parsed.removeAttribute("width");
                parsed.removeAttribute("height");
                parsed.setAttribute("class", img.className);
                parsed.setAttribute("role", "img");
                parsed.setAttribute("aria-label", img.alt);
                const shapes = parsed.querySelectorAll("line, path");
                gsap.set(shapes, { drawSVG: "0%" });
                gsap.set(parsed.querySelectorAll("path"), { fillOpacity: 0 });
                img.insertAdjacentElement("afterend", parsed as unknown as Element);
                img.style.visibility = "hidden";
                svg = parsed;
                cleanups.push(() => {
                  parsed.remove();
                  img.style.visibility = "";
                });
              })
              .catch(() => {});
            return () => {
              started = true;
              const drawing = svg;
              if (!drawing) return unveil();
              const shapes = [...drawing.querySelectorAll("line, path")];
              const faces = [...drawing.querySelectorAll("path")];
              const spread = { amount: HOUSE.spread, ease: "power1.in" };
              const timeline = gsap.timeline({
                onComplete: () => {
                  gsap.set(shapes, { clearProps: "all" });
                  img.style.display = "none";
                },
              });
              timeline.to(
                shapes,
                {
                  drawSVG: "100%",
                  duration: HOUSE.draw,
                  ease: "power2.inOut",
                  stagger: spread,
                },
                0,
              );
              timeline.to(
                faces,
                {
                  fillOpacity: 1,
                  duration: HOUSE.draw,
                  ease: "power1.out",
                  stagger: spread,
                },
                0,
              );
              return timeline;
            };
          }
        };

        const inView = (el: HTMLElement) =>
          el.getBoundingClientRect().top < window.innerHeight * 0.9;

        const register = (el: HTMLElement) => {
          el.dataset.motionReady = "";
          const type = el.dataset.motion;
          if (!type || inView(el)) return;
          try {
            let reveal: Reveal | undefined;
            if (type === "sequence" && compact) {
              // Stacked layout: a long section would play its lower half off-screen.
              el.querySelectorAll<HTMLElement>("[data-motion-step]").forEach((step) => {
                step.dataset.motion = step.dataset.motionStep;
                register(step);
              });
              return;
            }
            if (type === "sequence") {
              // One timeline for the section: each step has its own type and start offset.
              const steps = [...el.querySelectorAll<HTMLElement>("[data-motion-step]")]
                .map((step) => ({
                  reveal: prepare(step, step.dataset.motionStep ?? ""),
                  at: Number(step.dataset.motionAt ?? 0),
                }))
                .filter((step) => step.reveal);
              reveal = () => {
                const timeline = gsap.timeline();
                steps.forEach((step) => timeline.add(step.reveal!(), step.at));
                return timeline;
              };
            } else {
              reveal = prepare(el, type);
            }
            if (!reveal) return;
            let played = false;
            const play = () => {
              if (played) return;
              played = true;
              reveal();
            };
            ScrollTrigger.create({
              trigger: el,
              start: START,
              once: true,
              onEnter: play,
              onLeave: play,
            });
          } catch {
            gsap.set(el, { clearProps: "all" });
          }
        };

        const scan = () => {
          frame = undefined;
          if (!ready) return;
          main
            .querySelectorAll<HTMLElement>("[data-motion]:not([data-motion-ready])")
            .forEach((el) => {
              // Inside a Suspense boundary that has not hydrated yet the markup is still
              // React's to claim; it is picked up when the boundary announces itself.
              const gate =
                el.closest<HTMLElement>("[data-motion-gate]")?.dataset.motionGate;
              if (gate && !isMotionGateHydrated(gate)) return;
              register(el);
            });
          ScrollTrigger.refresh();
        };
        const schedule = () => {
          if (frame === undefined) frame = requestAnimationFrame(scan);
        };

        // Content that streams in (Suspense) is registered as it mounts, not on a guess.
        const observer = new MutationObserver(schedule);
        observer.observe(main, { childList: true, subtree: true });
        window.addEventListener("motion:hydrated", schedule);
        // Line splitting needs the real font metrics.
        void document.fonts.ready.then(() => {
          ready = true;
          schedule();
        });

        return () => {
          observer.disconnect();
          window.removeEventListener("motion:hydrated", schedule);
          if (frame !== undefined) cancelAnimationFrame(frame);
          cleanups.forEach((cleanup) => cleanup());
          // Strict Mode (and a reduced-motion toggle) re-runs this: let every element be
          // registered afresh instead of staying flagged while its animation is reverted.
          main
            .querySelectorAll<HTMLElement>("[data-motion-ready]")
            .forEach((el) => el.removeAttribute("data-motion-ready"));
        };
      },
    );
    return () => mm.revert();
  }, []);

  return null;
}
