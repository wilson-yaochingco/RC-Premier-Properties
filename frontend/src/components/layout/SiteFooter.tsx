import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

const footerNavigation = [
  { href: "/properties", label: "Browse properties" },
  { href: "/about", label: "About" },
  { href: "/sell", label: "Sell a property" },
  { href: "/book-viewing", label: "Book a viewing" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__invitation">
        <Container>
          <p className="eyebrow">Your next move</p>
          <div className="site-footer__invitation-row">
            <h2>Let&apos;s make space for what comes next.</h2>
            <Button href="/contact" variant="secondary">
              Start a conversation
            </Button>
          </div>
        </Container>
      </div>

      <Container className="site-footer__main">
        <div className="site-footer__brand">
          <Link
            href="/"
            className="brand-name-slot brand-name-slot--footer"
            aria-label="RC Premier Properties home"
            data-brand-slot="text"
          >
            <span>RC Premier</span>
            <span>Properties</span>
          </Link>
          <p>A considered property experience centered on Angeles City and Pampanga.</p>
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

        <div className="site-footer__location">
          <p className="eyebrow">Primary area</p>
          <p>Angeles City</p>
          <p>Pampanga, Philippines</p>
        </div>

        <div className="site-footer__bottom">
          <p>© {new Date().getFullYear()} RC Premier Properties</p>
          <p>Real media and business contact details to be supplied.</p>
        </div>
      </Container>
    </footer>
  );
}
