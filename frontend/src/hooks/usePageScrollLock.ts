"use client";

import { useEffect } from "react";
import { useLenis } from "lenis/react";

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
        window.scrollTo({ top: scrollY, behavior: "instant" });
        root.style.scrollBehavior = previous.scrollBehavior;
        return scrollY;
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
    };
  }, [active, lenis]);
}
