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
  { href: "/properties", label: "Properties" },
  { href: "/locations", label: "Locations" },
  { href: "/sell", label: "Sell" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

const NEAR_TOP_PX = 40;
/** Editorial routes that share the redesigned header; detail routes keep the classic bar. */
const HEROLESS_PATHS = new Set([
  "/properties",
  "/locations",
  "/sell",
  "/contact",
  "/book-viewing",
]);
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
  // Pages without a hero use the homepage header in its sticky state from the first paint.
  const cinematic = isHome || isAbout;
  const heroless = HEROLESS_PATHS.has(pathname);
  const usesHomeHeader = cinematic || heroless;
  const eligible = isAbout || heroless || heroGone;
  const sticky = heroless || stickyMounted;

  useEffect(() => {
    if (!cinematic) return;
    const hero = document.querySelector(
      isAbout ? "section[data-about-hero]" : "[data-home-hero]",
    );
    if (!hero) return;
    let exitTimeout: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
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
    observer.observe(hero);
    return () => {
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
  }, [cinematic, isAbout]);

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
          aria-hidden={!eligible}
          inert={!eligible || menuOpen}
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
