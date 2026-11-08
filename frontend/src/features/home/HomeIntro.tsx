"use client";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLayoutEffect } from "react";
import { RcPremierMark } from "@/components/layout/RcPremierMark";
import styles from "./home-intro.module.css";

const HOME_SCROLL_KEY = "rc-home-scroll";
let poppedToHome = false;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    poppedToHome = true;
  });
}

const finish = () => {
  const root = document.documentElement;
  if (root.dataset.intro === "play") root.dataset.intro = "done";
};

/**
 * First-load brand intro. The whole timeline is CSS keyed off `html[data-intro="play"]`,
 * which the inline script in the root layout sets before first paint, and only on a tab's first
 * page load when that page is Home. This component only ends the intro: once the last hero
 * element settles, or on Escape or a safety timeout. With no JavaScript the animation still
 * runs once and leaves the viewport on its own.
 */
export function HomeIntro() {
  // Home owns its scroll position: a reload or a fresh visit starts at the top, while Back and
  // Forward return to where the visitor was. A hash in the URL is left to the browser.
  useLayoutEffect(() => {
    let y = window.scrollY;
    let stopLanding = () => {};
    const track = () => {
      y = window.scrollY;
    };
    window.addEventListener("scroll", track, { passive: true });
    const save = () => {
      try {
        sessionStorage.setItem(HOME_SCROLL_KEY, String(Math.round(y)));
      } catch {}
    };
    // Leaving the document (reload, or a full navigation) marks this entry as manually
    // restored, so the browser does not scroll it back before Home decides where to start.
    const leave = () => {
      save();
      history.scrollRestoration = "manual";
    };
    window.addEventListener("pagehide", leave);
    if (window.location.hash) {
      // Manual restoration also stops the browser re-scrolling to the fragment on a reload.
      document
        .getElementById(decodeURIComponent(window.location.hash.slice(1)))
        ?.scrollIntoView();
    } else {
      const navigation = performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined;
      const history_ = poppedToHome || navigation?.type === "back_forward";
      let target = 0;
      try {
        if (history_) target = Number(sessionStorage.getItem(HOME_SCROLL_KEY)) || 0;
      } catch {}
      // Cleared after this commit (Strict Mode runs the effect twice within it).
      queueMicrotask(() => {
        poppedToHome = false;
      });
      if (target > 1) {
        // ScrollTrigger's own refresh scrolls to the top and back to the position it cached,
        // which is stale here; land on the target once that first refresh has finished.
        const land = () => {
          ScrollTrigger.removeEventListener("refresh", land);
          if (window.scrollY < 1) window.scrollTo(0, target);
        };
        ScrollTrigger.addEventListener("refresh", land);
        stopLanding = () => ScrollTrigger.removeEventListener("refresh", land);
      } else if (window.scrollY > 1) {
        window.scrollTo(0, 0);
      }
      y = target;
    }
    return () => {
      window.removeEventListener("scroll", track);
      window.removeEventListener("pagehide", leave);
      stopLanding();
      save();
      history.scrollRestoration = "auto";
    };
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== "play") return;

    // The intro ends when the last hero element has settled, so nothing snaps mid-reveal.
    const last = document.querySelector("[data-intro-last]");
    last?.addEventListener("animationend", finish, { once: true });
    const safety = window.setTimeout(finish, 5000);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(safety);
      last?.removeEventListener("animationend", finish);
      window.removeEventListener("keydown", onKeyDown);
      // Strict Mode re-runs this effect at once; only end the intro if the page really left.
      queueMicrotask(() => {
        if (!document.querySelector("[data-home-intro]")) finish();
      });
    };
  }, []);

  return (
    <div className={styles.overlay} data-home-intro>
      <RcPremierMark className={styles.mark} aria-hidden="true" />
    </div>
  );
}
