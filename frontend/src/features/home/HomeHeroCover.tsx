"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The hero is sticky, so the next section slides over it with plain scrolling. This adds the
 * scroll-linked polish: the hero's copy drifts up and the film dims as it is covered, and the
 * video pauses once it is fully hidden. Desktop and tablet only; reduced motion gets none.
 */
export function HomeHeroCover() {
  useGSAP(() => {
    const end = document.querySelector("[data-home-hero-end]");
    if (!end) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const video = document.querySelector<HTMLVideoElement>("[data-home-hero] video");
      const play = () => void video?.play().catch(() => {});
      ScrollTrigger.create({
        trigger: end,
        start: "top top",
        onEnter: () => video?.pause(),
        onLeaveBack: play,
        // Arriving from a scrolled page, the trigger is created past its start and pauses the
        // film; the scroll reset then only refreshes it, which fires no callback. Re-sync here.
        onRefresh: (self) => (self.scroll() >= self.start ? video?.pause() : play()),
      });
    });
    mm.add("(prefers-reduced-motion: no-preference) and (min-width: 48rem)", () => {
      const scrub = { trigger: end, start: "top bottom", end: "top top", scrub: true };
      gsap.fromTo(
        "[data-hero-cover]",
        { opacity: 0 },
        { opacity: 0.5, ease: "none", scrollTrigger: scrub },
      );
      gsap.fromTo(
        "[data-hero-layer]",
        { y: 0 },
        { y: -48, ease: "none", scrollTrigger: scrub },
      );
    });
    return () => mm.revert();
  }, []);

  return null;
}
