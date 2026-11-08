"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** The two flagship routes are warmed in the background so their swap is as short as possible. */
const WARM_ROUTES = ["/", "/about"];
/**
 * One continuous wipe. A power2 ease-in ends at 2·D/t and a power3 ease-out starts at
 * 3·D/t, so a 2:3 duration ratio makes the panel leave the cover at exactly the speed it
 * arrived: no pause or snap at the seam. Together 0.675s once the destination is ready.
 */
const COVER = { duration: 0.27, ease: "power2.in" };
const REVEAL = { duration: 0.405, ease: "power3.out" };
/** If the destination never arrives, uncover the page the visitor is still on. */
const ARRIVAL_TIMEOUT_MS = 4000;

const normalise = (path: string) => path.replace(/\/+$/, "") || "/";

/**
 * Every public page takes the wipe. The admin area, API and route-handler files (sitemaps,
 * robots, llms.txt) are never covered, so those navigations stay exactly as they are.
 */
const isPublicPage = (path: string) =>
  !/^\/(admin|api|sitemap)(\/|$)/.test(path) && !/\.[a-z0-9]+$/i.test(path);

/**
 * A plain warm-ivory panel rises over the viewport, the route changes behind it, then the
 * panel carries on upward to reveal the destination. It is revealed only after the new route
 * has mounted, scroll is back at the top and ScrollTrigger has re-measured, and it stays put
 * for as long as the navigation takes. Document-level capture of internal link clicks means
 * the menu, the logos and in-page links all take the same path. Only a change of page is
 * covered: filtering, sorting, hash links and other same-page URL changes, Back/Forward,
 * modified clicks, non-public routes and reduced motion keep the normal navigation.
 */
export function PageTransition() {
  const panel = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  const arrived = useRef<(() => void) | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  useEffect(() => {
    arrived.current?.();
  }, [pathname]);

  // Warm the other route so the swap behind the panel is as short as the router allows.
  useEffect(() => {
    const current = normalise(pathname);
    if (!WARM_ROUTES.includes(current)) return;
    WARM_ROUTES.filter((route) => route !== current).forEach((route) =>
      router.prefetch(route),
    );
  }, [pathname, router]);

  useEffect(() => {
    const el = panel.current;
    if (!el) return;

    const finish = () => {
      gsap.set(el, { yPercent: 100, visibility: "hidden", pointerEvents: "none" });
      busy.current = false;
    };
    finish();

    const reveal = () => {
      // The route is mounted and its triggers exist; settle scroll and measurements first.
      lenisRef.current?.scrollTo(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
      ScrollTrigger.refresh();
      requestAnimationFrame(() =>
        gsap.to(el, { yPercent: -100, ...REVEAL, onComplete: finish }),
      );
    };

    const run = (from: string, destination: string) => {
      gsap.set(el, { yPercent: 100, visibility: "visible", pointerEvents: "auto" });
      gsap.to(el, {
        yPercent: 0,
        ...COVER,
        onComplete: () => {
          // Back/Forward moved the page while the panel was rising: nothing left to load.
          if (normalise(window.location.pathname) !== from) {
            reveal();
            return;
          }
          let done = false;
          const settle = () => {
            if (done) return;
            done = true;
            window.clearTimeout(timeout);
            arrived.current = null;
            reveal();
          };
          const timeout = window.setTimeout(settle, ARRIVAL_TIMEOUT_MS);
          arrived.current = settle;
          router.push(destination);
        },
      });
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>(
        "a[href]",
      );
      if (
        !link ||
        (link.target && link.target !== "_self") ||
        link.hasAttribute("download")
      )
        return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const from = normalise(window.location.pathname);
      const to = normalise(url.pathname);
      if (from === to || !isPublicPage(from) || !isPublicPage(to)) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      event.preventDefault();
      event.stopPropagation();
      if (busy.current) return;
      busy.current = true;
      run(from, `${url.pathname}${url.search}${url.hash}`);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      gsap.killTweensOf(el);
      arrived.current = null;
      finish();
    };
  }, [router]);

  return (
    <div
      ref={panel}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        background: "var(--color-background)",
        visibility: "hidden",
        pointerEvents: "none",
      }}
    />
  );
}
