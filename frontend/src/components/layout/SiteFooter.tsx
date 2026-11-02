import Link from "next/link";
import { Container } from "@/components/ui/Container";
import {
  OFFICIAL_EMAIL,
  OFFICIAL_PHONE,
  OFFICIAL_PHONE_HREF,
  OFFICIAL_SOCIAL_LINKS,
} from "@/lib/public-contact";
import { BrandLogo } from "./BrandLogo";

function PhoneIcon() {
  return (
    <svg
      aria-hidden="true"
      className="footer-contact__icon"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M2.5 4.167a1.667 1.667 0 0 1 1.667-1.667h2.175c.404 0 .75.288.823.686l.666 3.66a.833.833 0 0 1-.36.837l-1.65 1.1a10.833 10.833 0 0 0 5.495 5.495l1.1-1.65a.833.833 0 0 1 .838-.36l3.66.666c.398.072.686.419.686.823v2.176a1.667 1.667 0 0 1-1.667 1.667h-.833C9.07 17.5 2.5 10.93 2.5 2.833v-.666Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      className="footer-contact__icon"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M3.333 4.167h13.334c.92 0 1.666.746 1.666 1.666v8.334c0 .92-.746 1.666-1.666 1.666H3.333c-.92 0-1.666-.746-1.666-1.666V5.833c0-.92.746-1.666 1.666-1.666Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m18.333 5.833-8.333 5.834-8.333-5.834"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      aria-hidden="true"
      className="footer-contact__icon"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M10 10.833a2.083 2.083 0 1 0 0-4.166 2.083 2.083 0 0 0 0 4.166Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.25 8.75c0 4.583-6.25 9.583-6.25 9.583s-6.25-5-6.25-9.583a6.25 6.25 0 0 1 12.5 0Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Container className="site-footer__inner">
        <div className="site-footer__grid">
          <div className="site-footer__brand-col">
            <BrandLogo footer />
            <p className="site-footer__tagline">
              Residential property discovery and inquiry support across Pampanga.
            </p>
          </div>

          <div className="site-footer__col">
            <h3 className="site-footer__col-title">Properties</h3>
            <ul className="site-footer__list">
              <li>
                <Link href="/properties">All Properties</Link>
              </li>
              <li>
                <Link href="/locations">By Location</Link>
              </li>
              <li>
                <Link href="/properties?propertyType=house-and-lot">
                  House &amp; Lot
                </Link>
              </li>
              <li>
                <Link href="/properties?propertyType=condominium">Condominium</Link>
              </li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h3 className="site-footer__col-title">Locations</h3>
            <ul className="site-footer__list">
              <li>
                <Link href="/locations/angeles-city">Angeles City</Link>
              </li>
              <li>
                <Link href="/locations/mabalacat-city">Mabalacat</Link>
              </li>
              <li>
                <Link href="/locations/city-of-san-fernando">City of San Fernando</Link>
              </li>
              <li>
                <Link href="/locations/porac">Porac</Link>
              </li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h3 className="site-footer__col-title">Company</h3>
            <ul className="site-footer__list">
              <li>
                <Link href="/about">About</Link>
              </li>
              <li>
                <Link href="/sell">Sell Your Property</Link>
              </li>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h3 className="site-footer__col-title">Get in touch</h3>
            <ul className="site-footer__contact-list">
              <li>
                <a href={OFFICIAL_PHONE_HREF} className="site-footer__contact-link">
                  <PhoneIcon />
                  <span>{OFFICIAL_PHONE}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${OFFICIAL_EMAIL}`}
                  className="site-footer__contact-link"
                >
                  <MailIcon />
                  <span>{OFFICIAL_EMAIL}</span>
                </a>
              </li>
              <li className="site-footer__contact-link">
                <PinIcon />
                <span>Pampanga, Philippines</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="site-footer__bottom">
          <p className="site-footer__copyright">
            © {new Date().getFullYear()} RC Premier Properties. All rights reserved.
          </p>

          <nav className="site-footer__social-links" aria-label="Social media">
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
        </div>
      </Container>
    </footer>
  );
}
