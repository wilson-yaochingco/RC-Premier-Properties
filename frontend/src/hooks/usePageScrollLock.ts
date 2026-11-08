"use client";

import { useEffect } from "react";
import { useLenis } from "lenis/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let locks = 0;
let restorePage: (() => number) | undefined;

export function usePageScrollLock(active: boolean) {
  const lenis = useLenis();

  useEffect(() => {
    if (!active) return;
    lenis?.stop();

    if (locks === 0) {
      const body = document.body;
      const root = document.documentElement;
      const scrollY = window.scrollY;
      const lockedPath = window.location.pathname;
      const previous = {
        position: body.style.position,
        top: body.style.top,
        width: body.style.width,
        overflowY: root.style.overflowY,
        scrollBehavior: root.style.scrollBehavior,
      };
      root.style.overflowY = "scroll";
      root.style.scrollBehavior = "auto";
      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.width = "100%";

      restorePage = () => {
        body.style.position = previous.position;
        body.style.top = previous.top;
        body.style.width = previous.width;
        root.style.overflowY = previous.overflowY;
        // Navigating from the open menu lands on the new route at its top, not at the old offset.
        const top = window.location.pathname === lockedPath ? scrollY : 0;
        window.scrollTo({ top, behavior: "instant" });
        root.style.scrollBehavior = previous.scrollBehavior;
        return top;
      };
    }
    locks += 1;

    return () => {
      locks -= 1;
      if (locks !== 0) return;
      const scrollY = restorePage?.();
      restorePage = undefined;
      lenis?.resize();
      if (scrollY !== undefined) {
        lenis?.scrollTo(scrollY, { immediate: true, force: true });
      }
      lenis?.start();
      // A page mounted while the body was pinned (navigating from the open menu) measured its
      // triggers against the pinned layout; re-measure now that the page is back to normal.
      ScrollTrigger.refresh();
    };
  }, [active, lenis]);
}
