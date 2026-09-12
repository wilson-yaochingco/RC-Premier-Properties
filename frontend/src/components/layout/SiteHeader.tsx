"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import { RequestTourButton } from "@/features/inquiries/RequestTourProvider";
import { BrandLogo } from "./BrandLogo";
import { MobileNavigation } from "./MobileNavigation";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/properties", label: "Properties" },
  { href: "/locations", label: "Locations" },
  { href: "/sell", label: "Sell" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

const NEAR_TOP_PX = 72;
const DOWNWARD_HIDE_DISTANCE_PX = 48;
const UPWARD_SHOW_DISTANCE_PX = 24;

export function SiteHeader() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const menuOpenRef = useRef(false);
  const pointerActiveRef = useRef(false);
  const hiddenRef = useRef(false);
  const [isHidden, setIsHidden] = useState(false);

  const showHeader = useCallback(() => {
    if (!hiddenRef.current) return;
    hiddenRef.current = false;
    setIsHidden(false);
  }, []);

  const handleMenuOpenChange = useCallback(
    (isOpen: boolean) => {
      menuOpenRef.current = isOpen;
      if (isOpen) showHeader();
    },
    [showHeader],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      hiddenRef.current = false;
      pointerActiveRef.current = false;
      showHeader();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname, showHeader]);

  useEffect(() => {
    let frame: number | undefined;
    let lastScrollY = Math.max(window.scrollY, 0);
    let direction: -1 | 0 | 1 = 0;
    let travelled = 0;

    const update = () => {
      frame = undefined;
      const scrollY = Math.max(window.scrollY, 0);
      const delta = scrollY - lastScrollY;
      lastScrollY = scrollY;

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
  }, [pathname, showHeader]);

  function isCurrentPage(href: string) {
    if (href.includes("#")) return false;
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <header
      ref={headerRef}
      className="site-header"
      data-hidden={isHidden}
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

        <RequestTourButton variant="outline" className="site-header__cta" />

        <MobileNavigation
          items={navigation}
          currentPath={pathname}
          onOpenChange={handleMenuOpenChange}
        />
      </Container>
    </header>
  );
}
