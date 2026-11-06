"use client";

import { useEffect, useRef, useState } from "react";

export function HomeHeroVideo({ className }: { className: string }) {
  const [reducedMotion, setReducedMotion] = useState(true);
  const [ready, setReady] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (reducedMotion) {
      element.pause();
      const pauseAtFirstFrame = () => {
        element.pause();
        element.currentTime = 0;
        setReady(true);
      };
      element.addEventListener("loadeddata", pauseAtFirstFrame, { once: true });
      element.load();
      if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) pauseAtFirstFrame();
      return () => element.removeEventListener("loadeddata", pauseAtFirstFrame);
    }
    void element.play().catch(() => {});
  }, [reducedMotion]);

  return (
    <video
      ref={video}
      aria-hidden="true"
      className={className}
      data-ready={ready}
      autoPlay={!reducedMotion}
      muted
      loop
      playsInline
      preload="none"
      tabIndex={-1}
      onLoadedData={() => setReady(true)}
    >
      <source src="/media/homepage-hero.mp4" type="video/mp4" />
    </video>
  );
}
