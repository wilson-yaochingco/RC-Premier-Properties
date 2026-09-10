"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface NavigationItem {
  href: string;
  label: string;
}

interface MobileNavigationProps {
  items: readonly NavigationItem[];
  currentPath: string;
}

export function MobileNavigation({ items, currentPath }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    firstLinkRef.current?.focus();
  }, [isOpen]);

  function closeMenu() {
    setIsOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      closeMenu();
      triggerRef.current?.focus();
      return;
    }

    if (event.key !== "Tab" || !isOpen) return;

    const focusableElements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href][tabindex="0"]',
      ),
    );
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
    <div className="mobile-navigation" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className="mobile-navigation__trigger"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation-panel"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{isOpen ? "Close" : "Menu"}</span>
        <span className="menu-icon" aria-hidden="true">
          <span />
          <span />
        </span>
      </button>

      <div
        ref={panelRef}
        id="mobile-navigation-panel"
        className="mobile-navigation__panel"
        data-open={isOpen}
        aria-hidden={!isOpen}
      >
        <nav aria-label="Mobile navigation">
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

        <div className="mobile-navigation__footer">
          <p>Homes and residential properties for sale across Pampanga.</p>
          <Link href="/book-viewing" onClick={closeMenu} tabIndex={isOpen ? 0 : -1}>
            Book a Viewing
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
