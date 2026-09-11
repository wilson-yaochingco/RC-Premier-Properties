"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function SiteHeader() {
  const pathname = usePathname();

  function isCurrentPage(href: string) {
    if (href.includes("#")) return false;
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <header className="site-header">
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

        <MobileNavigation items={navigation} currentPath={pathname} />
      </Container>
    </header>
  );
}
