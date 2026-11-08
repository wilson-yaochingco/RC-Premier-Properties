"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePageScrollLock } from "@/hooks/usePageScrollLock";
import { useRequestTour } from "@/features/inquiries/RequestTourProvider";
import { RcPremierMark } from "./RcPremierMark";
import { SocialMediaIcon } from "@/features/contact/SocialMediaIcon";
import { OFFICIAL_EMAIL, OFFICIAL_SOCIAL_LINKS } from "@/lib/public-contact";
import heroStyles from "@/features/home/hero.module.css";

interface NavigationItem {
  href: string;
  label: string;
}

interface MobileNavigationProps {
  items: readonly NavigationItem[];
  currentPath: string;
  onOpenChange?: (isActive: boolean, isOpen: boolean) => void;
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
  // The menu is open only for the route it was opened on, so a route change (a link,
  // back/forward, a programmatic push) can never leave a stale open menu or scroll lock.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  if (openedAt !== null && openedAt !== currentPath) setOpenedAt(null);
  const isOpen = openedAt === currentPath;
  const [isClosing, setIsClosing] = useState(false);
  const isActive = isOpen || isClosing;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  usePageScrollLock(isActive);

  useEffect(() => {
    onOpenChange?.(isActive, isOpen);
  }, [isActive, isOpen, onOpenChange]);

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
    setOpenedAt(isOpenNext ? currentPath : null);
    if (!isOpenNext) triggerRef.current?.focus();
  }

  function closeMenu() {
    updateMenu(false);
  }

  // Any internal link inside the menu, including the Book a Viewing CTA passed as
  // `children`, closes it; this also covers a click on the page the visitor is already on.
  function handleLinkClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!isOpen || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
    if (link?.getAttribute("href")?.startsWith("/")) closeMenu();
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
      onClickCapture={handleLinkClick}
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
            <Link
              href="/"
              className={heroStyles.menuLogoLink}
              aria-label="RC Premier Properties home"
              tabIndex={isOpen ? 0 : -1}
            >
              <RcPremierMark className={heroStyles.menuLogo} aria-hidden="true" />
            </Link>
          )}
          <div className={cinematic ? heroStyles.menuBody : undefined}>
            <nav aria-label={cinematic ? "Primary navigation" : "Mobile navigation"}>
              <ul className={cinematic ? heroStyles.menuList : undefined}>
                {items.map((item, index) => (
                  <li
                    key={item.href}
                    className={cinematic ? heroStyles.menuItem : undefined}
                  >
                    <Link
                      ref={index === 0 ? firstLinkRef : undefined}
                      href={item.href}
                      className={cinematic ? heroStyles.menuLink : undefined}
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
                      {cinematic && (
                        <svg
                          aria-hidden="true"
                          className={heroStyles.menuArrow}
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M2 8h12M9 3l5 5-5 5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        </svg>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            {cinematic && (
              <div className={heroStyles.menuViewingInline}>{children}</div>
            )}
            {cinematic && (
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
                    <span className={heroStyles.menuSocialLabel}>{item.label}</span>
                  </a>
                ))}
              </nav>
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
