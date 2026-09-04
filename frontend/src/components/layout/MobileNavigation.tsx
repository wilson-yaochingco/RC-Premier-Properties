"use client";

import Link from "next/link";
import { useRef, useState } from "react";

interface NavigationItem {
  href: string;
  label: string;
}

interface MobileNavigationProps {
  items: readonly NavigationItem[];
}

export function MobileNavigation({ items }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
        id="mobile-navigation-panel"
        className="mobile-navigation__panel"
        data-open={isOpen}
        aria-hidden={!isOpen}
      >
        <nav aria-label="Mobile navigation">
          <ul>
            {items.map((item, index) => (
              <li key={item.href}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <Link href={item.href} onClick={closeMenu} tabIndex={isOpen ? 0 : -1}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mobile-navigation__footer">
          <p>Property discovery across Angeles City and Pampanga.</p>
          <Link href="/contact" onClick={closeMenu} tabIndex={isOpen ? 0 : -1}>
            Start a conversation
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
