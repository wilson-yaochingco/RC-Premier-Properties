"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import { RollLabel } from "@/components/ui/RollLabel";
import { Button } from "@/components/ui/Button";
import { RequestTourButton } from "@/features/inquiries/RequestTourProvider";
import { BrandLogo } from "./BrandLogo";
import { MobileNavigation } from "./MobileNavigation";
import heroStyles from "@/features/home/hero.module.css";

const navigation = [
  { href: "/about", label: "About" },
  { href: "/properties", label: "Properties" },
  { href: "/locations", label: "Locations" },
  { href: "/sell", label: "Sell" },
  { href: "/contact", label: "Contact" },
] as const;

const NEAR_TOP_PX = 40;
/** Only location guides keep the classic bar; every other route, including property detail pages and unknown URLs that land on the 404, uses the redesigned header. */
const CLASSIC_HEADER_PATH = /^\/locations\/[^/]+/;
const DOWNWARD_HIDE_DISTANCE_PX = 48;
const UPWARD_SHOW_DISTANCE_PX = 24;

export function SiteHeader() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const menuOpenRef = useRef(false);
  const pointerActiveRef = useRef(false);
  const hiddenRef = useRef(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [heroGone, setHeroGone] = useState(false);
  const [stickyMounted, setStickyMounted] = useState(false);
  // Slide transitions stay off until the bar has actually been shown once, so a
  // freshly mounted (hidden) bar snaps out of view instead of animating from visible.
  const [stickyMotion, setStickyMotion] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const heroGoneRef = useRef(false);
  const isHome = pathname === "/";
  const isAbout = pathname === "/about";
  const isProperties = pathname === "/properties";
  const isLocations = pathname === "/locations";
  const isSell = pathname === "/sell";
  // Pages without a hero use the homepage header in its sticky state from the first paint.
  const cinematic = isHome || isAbout || isProperties || isLocations || isSell;
  const heroless = !cinematic && !CLASSIC_HEADER_PATH.test(pathname);
  const usesHomeHeader = cinematic || heroless;
  const eligible = isAbout || isSell || heroless || heroGone;
  const sticky = heroless || stickyMounted;

  useEffect(() => {
    if (!cinematic) return;
    // Home, About and Locations layer the next section over a sticky hero; the sentinel
    // after it marks the moment the hero is fully covered.
    const rebinds = isProperties || isLocations;
    const selector = isProperties
      ? "section[data-properties-hero]"
      : "[data-home-hero-end]";
    let hero = document.querySelector(selector);
    if (!hero && !rebinds) return;
    let exitTimeout: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (rebinds && (entry.target !== hero || !entry.target.isConnected)) return;
        if (document.body.style.position === "fixed") return;
        const gone = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
        if (gone === heroGoneRef.current) return;
        heroGoneRef.current = gone;
        setHeroGone(gone);
        window.clearTimeout(exitTimeout);
        hiddenRef.current = true;
        setIsHidden(true);
        if (gone) {
          setStickyMounted(true);
        } else {
          const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? 0
            : 330;
          exitTimeout = window.setTimeout(() => {
            setStickyMounted(false);
            setStickyMotion(false);
            hiddenRef.current = false;
            setIsHidden(false);
          }, duration);
        }
      },
      { threshold: 0 },
    );
    if (hero) observer.observe(hero);
    // Streamed pages (Locations, Properties) can replace their hero after the persistent
    // header mounts; keep observing the live one, not a skeleton that has since been removed.
    const bindHero = () => {
      const current = [...document.querySelectorAll(selector)].find(
        (element) => element.getClientRects().length,
      );
      if (!current || current === hero) return;
      observer.disconnect();
      hero = current;
      observer.observe(hero);
    };
    const mounts = rebinds ? new MutationObserver(bindHero) : undefined;
    mounts?.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden"],
    });
    if (rebinds) bindHero();
    return () => {
      mounts?.disconnect();
      observer.disconnect();
      window.clearTimeout(exitTimeout);
      // The header outlives the page. Cancelling a pending sticky exit would strand the
      // next route in the sticky state, so reset and let its own hero decide.
      heroGoneRef.current = false;
      hiddenRef.current = false;
      setHeroGone(false);
      setStickyMounted(false);
      setStickyMotion(false);
      setIsHidden(false);
    };
  }, [cinematic, isAbout, isProperties, isLocations, isSell]);

  const showHeader = useCallback(() => {
    if (cinematic && !heroGoneRef.current) return;
    if (!hiddenRef.current) return;
    hiddenRef.current = false;
    setStickyMotion(true);
    setIsHidden(false);
  }, [cinematic]);

  const handleMenuOpenChange = useCallback(
    (isActive: boolean, isExpanded: boolean) => {
      menuOpenRef.current = isActive;
      setMenuOpen(isActive);
      setMenuExpanded(isExpanded);
      if (isActive) showHeader();
    },
    [showHeader],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      pointerActiveRef.current = false;
      setIsScrolled(window.scrollY > NEAR_TOP_PX);
      showHeader();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname, showHeader]);

  useEffect(() => {
    let frame: number | undefined;
    let lastScrollY = Math.max(window.scrollY, 0);
    let direction: -1 | 0 | 1 = 0;
    let travelled = 0;
    let scrolled = window.scrollY > NEAR_TOP_PX;

    const update = () => {
      frame = undefined;
      const scrollY = Math.max(window.scrollY, 0);
      const delta = scrollY - lastScrollY;
      lastScrollY = scrollY;

      if (document.body.style.position === "fixed") return;
      if (cinematic && !heroGoneRef.current) return;

      if (scrollY > NEAR_TOP_PX !== scrolled) {
        scrolled = scrollY > NEAR_TOP_PX;
        setIsScrolled(scrolled);
      }

      if (scrollY <= NEAR_TOP_PX) {
        direction = 0;
        travelled = 0;
        showHeader();
        return;
      }

      if (Math.abs(delta) < 1) return;

      const nextDirection = delta > 0 ? 1 : -1;
      if (nextDirection !== direction) {
        direction = nextDirection;
        travelled = 0;
      }
      travelled += Math.abs(delta);

      const headerHasFocus = headerRef.current?.contains(document.activeElement);
      const keepVisible =
        menuOpenRef.current || pointerActiveRef.current || Boolean(headerHasFocus);

      if (keepVisible) {
        travelled = 0;
        showHeader();
        return;
      }

      const threshold =
        direction > 0 ? DOWNWARD_HIDE_DISTANCE_PX : UPWARD_SHOW_DISTANCE_PX;
      if (travelled < threshold) return;

      travelled = 0;
      const nextHidden = direction > 0;
      if (nextHidden === hiddenRef.current) return;
      hiddenRef.current = nextHidden;
      if (!nextHidden) setStickyMotion(true);
      setIsHidden(nextHidden);
    };

    const handleScroll = () => {
      if (frame !== undefined) return;
      frame = window.requestAnimationFrame(update);
    };

    const endPointerInteraction = () => {
      pointerActiveRef.current = false;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointerup", endPointerInteraction);
    window.addEventListener("pointercancel", endPointerInteraction);

    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointerup", endPointerInteraction);
      window.removeEventListener("pointercancel", endPointerInteraction);
    };
  }, [pathname, cinematic, showHeader]);

  function isCurrentPage(href: string) {
    if (href.includes("#")) return false;
    return pathname.startsWith(href);
  }

  const isTransparent = isHome && !isScrolled;

  if (usesHomeHeader) {
    return (
      <header
        ref={headerRef}
        className={heroStyles.header}
        data-about-hero={isAbout || undefined}
        data-sell-hero={isSell || undefined}
        data-properties-hero={isProperties || undefined}
        data-locations-hero={isLocations || undefined}
        data-sticky={sticky}
        data-eligible={eligible}
        data-motion={stickyMotion}
        data-hidden={sticky && (isHidden || !eligible)}
        data-menu-open={menuOpen}
        data-menu-expanded={menuExpanded}
        inert={sticky && (isHidden || !eligible)}
        onFocusCapture={showHeader}
        onPointerDownCapture={() => {
          pointerActiveRef.current = true;
          showHeader();
        }}
      >
        <div
          className={heroStyles.stickyLogo}
          aria-hidden={!(eligible || isProperties || isLocations)}
          inert={!(eligible || isProperties || isLocations) || menuOpen}
        >
          <BrandLogo />
        </div>
        <MobileNavigation
          items={navigation}
          currentPath={pathname}
          onOpenChange={handleMenuOpenChange}
          cinematic
        >
          <Link href="/book-viewing" className={`${heroStyles.viewing} cta`}>
            <RollLabel>Book a viewing</RollLabel>
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </Link>
        </MobileNavigation>
      </header>
    );
  }

  return (
    <header
      ref={headerRef}
      className="site-header"
      data-hidden={isHidden}
      data-transparent={isTransparent}
      data-scrolled={isScrolled}
      onFocusCapture={showHeader}
      onPointerDownCapture={() => {
        pointerActiveRef.current = true;
        showHeader();
      }}
    >
      <Container className="site-header__inner">
        <BrandLogo />

        <nav className="desktop-navigation" aria-label="Primary navigation">
          <ul>
            {navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isCurrentPage(item.href) ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__actions">
          <RequestTourButton variant="outline" className="site-header__tour-btn" />
          <Button href="/properties" variant="gold" className="site-header__browse-btn">
            Browse Properties
          </Button>
        </div>

        <MobileNavigation
          items={navigation}
          currentPath={pathname}
          onOpenChange={handleMenuOpenChange}
        />
      </Container>
    </header>
  );
}
