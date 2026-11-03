import Link from "next/link";
import {
  OFFICIAL_EMAIL,
  OFFICIAL_PHONE,
  OFFICIAL_PHONE_HREF,
  OFFICIAL_SOCIAL_LINKS,
} from "@/lib/public-contact";
import { RcPremierMark } from "./RcPremierMark";
import styles from "./site-footer.module.css";

const PROPERTY_LINKS = [
  { href: "/properties", label: "Browse Properties" },
  { href: "/locations", label: "By Location" },
  { href: "/properties?propertyType=house-and-lot", label: "House & Lot" },
] as const;

const COMPANY_LINKS = [
  { href: "/about", label: "About" },
  { href: "/sell", label: "Sell Your Property" },
  { href: "/contact", label: "Contact" },
] as const;

const LOCATION_LINKS = [
  { href: "/locations/angeles-city", label: "Angeles City" },
  { href: "/locations/mabalacat-city", label: "Mabalacat" },
  { href: "/locations/city-of-san-fernando", label: "City of San Fernando" },
  { href: "/locations/porac", label: "Porac" },
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

/**
 * Soft Stone editorial footer. Privacy Policy and Terms & Conditions links belong in the
 * bottom row once those routes exist; none are rendered until then.
 */
export function SiteFooter() {
  return (
    <footer className={`site-footer ${styles.footer}`}>
      <div className={styles.container} data-site-footer-main>
        <div className={styles.top}>
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

          <address className={styles.contact}>
            <h2 className={styles.label}>Let&apos;s talk</h2>
            <p className={styles.statement}>
              Have a property in mind?
              <br />
              Let&apos;s talk.
            </p>
            <ul className={styles.contactList}>
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
              <li className={styles.place}>Pampanga, Philippines</li>
            </ul>
            <ul className={styles.social} aria-label="Social media">
              {OFFICIAL_SOCIAL_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    className={styles.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`RC Premier Properties on ${label}`}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </address>

          <div className={styles.sitemap}>
            <LinkGroup
              id="footer-properties"
              title="Properties"
              links={PROPERTY_LINKS}
            />
            <LinkGroup id="footer-company" title="Company" links={COMPANY_LINKS} />
            <LinkGroup id="footer-locations" title="Locations" links={LOCATION_LINKS} />
          </div>
        </div>

        <div className={styles.bottom}>
          <p>
            © {new Date().getFullYear()} RC Premier Properties. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
