import { publicLocationCatalogPath } from "@/lib/public-location";
import Link from "next/link";
import { RollLabel } from "@/components/ui/RollLabel";
import { SocialMediaIcon } from "@/features/contact/SocialMediaIcon";
import {
  OFFICIAL_EMAIL,
  OFFICIAL_PHONE,
  OFFICIAL_PHONE_HREF,
  OFFICIAL_SOCIAL_LINKS,
} from "@/lib/public-contact";
import { RcPremierMark } from "./RcPremierMark";
import styles from "./site-footer.module.css";

const ACTIONS = [
  { href: "/properties", label: "Explore Properties" },
  { href: "/book-viewing", label: "Book a Viewing" },
] as const;

const DISCOVER_LINKS = [
  { href: "/properties", label: "Browse Properties" },
  { href: "/properties?propertyType=house-and-lot", label: "House & Lot" },
  { href: "/locations", label: "Explore Locations" },
  { href: "/book-viewing", label: "Book a Viewing" },
] as const;

const COMPANY_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/sell", label: "Sell Your Property" },
  { href: "/contact", label: "Contact Us" },
] as const;

const LOCATION_LINKS = [
  { href: publicLocationCatalogPath("Angeles City"), label: "Angeles City" },
  { href: publicLocationCatalogPath("Mabalacat City"), label: "Mabalacat" },
  {
    href: publicLocationCatalogPath("City of San Fernando"),
    label: "City of San Fernando",
  },
  { href: publicLocationCatalogPath("Porac"), label: "Porac" },
] as const;

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/disclaimer", label: "Property Disclaimer" },
] as const;

function LinkGroup({
  id,
  title,
  links,
}: {
  id: string;
  title: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <nav aria-labelledby={id}>
      <h2 id={id} className={styles.label}>
        {title}
      </h2>
      <ul className={styles.list}>
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} className={styles.link}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Full-width charcoal footer: an editorial closing line, the sitemap, then the legal row. */
export function SiteFooter() {
  return (
    <footer className={`site-footer ${styles.footer}`}>
      <div className={styles.inner} data-site-footer-main>
        <div className={styles.opening}>
          <div>
            <p className={styles.eyebrow}>RC Premier Properties / Pampanga</p>
            <h2 className={styles.headline}>
              <span>Your next move</span> <em>starts here.</em>
            </h2>
          </div>
          <ul className={styles.actions}>
            {ACTIONS.map(({ href, label }, index) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`${styles.action} ${index ? styles.secondary : ""} cta cta--wrap`}
                >
                  <RollLabel>{label}</RollLabel>
                  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.grid}>
          <div className={styles.brand}>
            <Link
              href="/"
              className={styles.mark}
              aria-label="RC Premier Properties home"
            >
              <RcPremierMark aria-hidden="true" />
            </Link>
            <p className={styles.name}>RC Premier Properties</p>
            <p className={styles.description}>
              Residential homes, properties, and real estate opportunities thoughtfully
              developed and presented across Pampanga.
            </p>
          </div>

          <LinkGroup id="footer-discover" title="Discover" links={DISCOVER_LINKS} />
          <LinkGroup id="footer-company" title="Company" links={COMPANY_LINKS} />
          <LinkGroup id="footer-locations" title="Locations" links={LOCATION_LINKS} />

          <address className={styles.contact}>
            <h2 className={styles.label}>Get in Touch</h2>
            <ul className={styles.list}>
              <li>
                <a href={OFFICIAL_PHONE_HREF} className={styles.link}>
                  {OFFICIAL_PHONE}
                </a>
              </li>
              <li>
                <a href={`mailto:${OFFICIAL_EMAIL}`} className={styles.link}>
                  {OFFICIAL_EMAIL}
                </a>
              </li>
              <li className={styles.muted}>Pampanga, Philippines</li>
            </ul>
            <ul className={styles.social} aria-label="Social media">
              {OFFICIAL_SOCIAL_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`RC Premier Properties on ${label} (opens in a new tab)`}
                    data-platform={label}
                  >
                    <SocialMediaIcon platform={label} />
                  </a>
                </li>
              ))}
            </ul>
          </address>
        </div>

        <div className={styles.bottom}>
          <p>
            © {new Date().getFullYear()} RC Premier Properties. All rights reserved.
          </p>
          <nav aria-label="Legal">
            <ul className={styles.legal}>
              {LEGAL_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={styles.link}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
