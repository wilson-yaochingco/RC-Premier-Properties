import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import {
  OFFICIAL_EMAIL,
  OFFICIAL_PHONE,
  OFFICIAL_PHONE_HREF,
  OFFICIAL_SOCIAL_LINKS,
} from "@/lib/public-contact";
import { BrandLogo } from "./BrandLogo";

const footerNavigation = [
  { href: "/properties", label: "Properties" },
  { href: "/locations", label: "Locations" },
  { href: "/sell", label: "Sell a Property" },
  { href: "/about", label: "About" },
  { href: "/book-viewing", label: "Request a Tour" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__invitation">
        <Container className="site-footer__invitation-row">
          <div>
            <p className="eyebrow">Your next move</p>
            <h2>Let’s find a home that suits you.</h2>
          </div>
          <Button href="/properties" variant="secondary">
            Browse properties
          </Button>
        </Container>
      </div>

      <Container className="site-footer__main">
        <div className="site-footer__brand">
          <BrandLogo footer />
          <p>Residential property discovery and inquiry support across Pampanga.</p>
        </div>

        <nav className="site-footer__navigation" aria-label="Footer navigation">
          <p className="eyebrow">Explore</p>
          <ul>
            {footerNavigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-footer__contact">
          <p className="eyebrow">Get in touch</p>
          <a href={`mailto:${OFFICIAL_EMAIL}`}>{OFFICIAL_EMAIL}</a>
          <a href={OFFICIAL_PHONE_HREF}>{OFFICIAL_PHONE}</a>
        </div>

        <nav className="site-footer__social" aria-label="Social media">
          <p className="eyebrow">Follow</p>
          <ul>
            {OFFICIAL_SOCIAL_LINKS.map((item) => (
              <li key={item.href}>
                <a href={item.href} target="_blank" rel="noopener noreferrer">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-footer__bottom">
          <p>© {new Date().getFullYear()} RC Premier Properties</p>
          <p>Pampanga, Philippines</p>
        </div>
      </Container>
    </footer>
  );
}
