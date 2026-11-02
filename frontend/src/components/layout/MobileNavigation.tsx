"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePageScrollLock } from "@/hooks/usePageScrollLock";
import { useRequestTour } from "@/features/inquiries/RequestTourProvider";
import whiteLogo from "@/assets/brand/rc-premier-logo-white.png";
import menuImage from "@/assets/site/home-hero-2.png";
import { OFFICIAL_EMAIL, OFFICIAL_SOCIAL_LINKS } from "@/lib/public-contact";
import { SocialMediaIcon } from "@/features/contact/SocialMediaIcon";
import heroStyles from "@/features/home/hero.module.css";

interface NavigationItem {
  href: string;
  label: string;
}

interface MobileNavigationProps {
  items: readonly NavigationItem[];
  currentPath: string;
  onOpenChange?: (isOpen: boolean) => void;
  cinematic?: boolean;
  children?: ReactNode;
}

export function MobileNavigation({
  items,
  currentPath,
  onOpenChange,
  cinematic = false,
  children,
}: MobileNavigationProps) {
  const { openTour, pageProperty } = useRequestTour();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const isActive = isOpen || isClosing;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  usePageScrollLock(isActive);

  useEffect(() => {
    onOpenChange?.(isActive);
  }, [isActive, onOpenChange]);

  useEffect(() => {
    if (!cinematic || !isActive) return;
    const background = Array.from(
      document.querySelectorAll<HTMLElement>("main, .site-footer, .skip-link"),
    );
    const previous = background.map((element) => element.inert);
    background.forEach((element) => {
      element.inert = true;
    });
    return () =>
      background.forEach((element, index) => {
        element.inert = previous[index];
      });
  }, [cinematic, isActive]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(() => firstLinkRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isClosing) return;
    // A rapid toggle can cancel the opacity transition before it emits transitionend.
    const timeout = window.setTimeout(() => setIsClosing(false), 420);
    return () => window.clearTimeout(timeout);
  }, [isClosing]);

  function updateMenu(isOpenNext: boolean) {
    setIsClosing(
      cinematic &&
        isOpen &&
        !isOpenNext &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    setIsOpen(isOpenNext);
    if (!isOpenNext) triggerRef.current?.focus();
  }

  function closeMenu() {
    updateMenu(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && isActive) {
      closeMenu();
      triggerRef.current?.focus();
      return;
    }

    if (event.key !== "Tab" || !isActive) return;

    const focusableElements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length > 0);
    const firstElement = focusableElements.at(0);
    const lastElement = focusableElements.at(-1);

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  }

  return (
    <div
      className="mobile-navigation"
      onKeyDown={handleKeyDown}
      role={cinematic && isActive ? "dialog" : undefined}
      aria-modal={cinematic && isActive ? true : undefined}
      aria-label={cinematic && isActive ? "Primary navigation" : undefined}
    >
      <div className={cinematic ? heroStyles.menuControls : undefined}>
        <button
          ref={triggerRef}
          type="button"
          className="mobile-navigation__trigger"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation-panel"
          onClick={() => updateMenu(!isOpen)}
        >
          {cinematic ? (
            <span className={heroStyles.menuLabel}>
              <span aria-hidden={isOpen}>Menu</span>
              <span aria-hidden={!isOpen}>Close</span>
            </span>
          ) : (
            <span>{isOpen ? "Close" : "Menu"}</span>
          )}
          <span className="menu-icon" aria-hidden="true">
            <span />
            <span />
          </span>
        </button>
        {cinematic && <div className={heroStyles.menuViewingTop}>{children}</div>}
      </div>

      <div
        ref={panelRef}
        id="mobile-navigation-panel"
        data-lenis-prevent
        className="mobile-navigation__panel"
        data-open={isOpen}
        aria-hidden={!isOpen}
        inert={!isOpen}
        onTransitionEnd={(event) => {
          if (
            event.target === panelRef.current &&
            event.propertyName === "opacity" &&
            !isOpen
          ) {
            setIsClosing(false);
          }
        }}
      >
        <div
          className={cinematic ? heroStyles.menuContent : undefined}
          style={cinematic ? undefined : { display: "contents" }}
        >
          {cinematic && (
            <Image
              className={heroStyles.menuLogo}
              src={whiteLogo}
              alt="RC Premier Properties"
              sizes="112px"
            />
          )}
          <div className={cinematic ? heroStyles.menuBody : undefined}>
            <nav
              className={cinematic ? heroStyles.menuNavigation : undefined}
              aria-label={cinematic ? "Primary navigation" : "Mobile navigation"}
            >
              <ul>
                {items.map((item, index) => (
                  <li key={item.href}>
                    <Link
                      ref={index === 0 ? firstLinkRef : undefined}
                      href={item.href}
                      onClick={closeMenu}
                      tabIndex={isOpen ? 0 : -1}
                      aria-current={
                        !item.href.includes("#") &&
                        (item.href === "/"
                          ? currentPath === "/"
                          : currentPath.startsWith(item.href))
                          ? "page"
                          : undefined
                      }
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            {cinematic && (
              <div className={heroStyles.menuViewingInline}>{children}</div>
            )}
            {cinematic && (
              <div className={heroStyles.menuEditorial}>
                <div className={heroStyles.menuVisual}>
                  <Image
                    src={menuImage}
                    alt="RC Premier residential property with a pool"
                    fill
                    sizes="(max-width: 639px) calc(100vw - 48px), (max-width: 768px) 1px, (max-width: 1200px) 45vw, 520px"
                  />
                </div>
                <div className={heroStyles.menuImageDetails}>
                  <nav className={heroStyles.menuSocials} aria-label="Social media">
                    {OFFICIAL_SOCIAL_LINKS.map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        aria-label={item.label}
                        target="_blank"
                        rel="noopener noreferrer"
                        tabIndex={isOpen ? 0 : -1}
                      >
                        <SocialMediaIcon platform={item.label} />
                      </a>
                    ))}
                  </nav>
                  <p className={heroStyles.menuMetadata}>
                    <span>Angeles City, Pampanga</span>
                    <span>Residential</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mobile-navigation__footer">
            <p>
              {cinematic
                ? `© ${new Date().getFullYear()} RC PREMIER PROPERTIES`
                : "Homes and residential properties for sale across Pampanga."}
            </p>
            {cinematic ? (
              <Link href={`mailto:${OFFICIAL_EMAIL}`} tabIndex={isOpen ? 0 : -1}>
                {OFFICIAL_EMAIL}
              </Link>
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  const trigger = event.currentTarget;
                  closeMenu();
                  window.requestAnimationFrame(() => openTour(undefined, trigger));
                }}
                tabIndex={isOpen ? 0 : -1}
                disabled={pageProperty?.availability === "sold"}
                title={
                  pageProperty?.availability === "sold"
                    ? "Tours are unavailable for sold properties."
                    : undefined
                }
              >
                Request a Tour
                <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
