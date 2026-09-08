import Image from "next/image";
import Link from "next/link";
import footerImage from "@/assets/site/footer.png";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { BrandLogo } from "./BrandLogo";

const footerNavigation = [
  { href: "/properties", label: "Properties" },
  { href: "/about", label: "About" },
  { href: "/book-viewing", label: "Book a Viewing" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__image" aria-hidden="true">
        <Image src={footerImage} alt="" fill sizes="100vw" />
      </div>
      <div className="site-footer__invitation">
        <Container>
          <p className="eyebrow">Your next move</p>
          <div className="site-footer__invitation-row">
            <h2>Find a home that suits your needs.</h2>
            <Button href="/properties" variant="secondary">
              Browse Properties
            </Button>
          </div>
        </Container>
      </div>

      <Container className="site-footer__main">
        <div className="site-footer__brand">
          <BrandLogo footer />
          <p>Houses and residential properties for sale in Pampanga.</p>
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
          <p className="eyebrow">Contact</p>
          <p>
            <a href="mailto:rcpremierph@gmail.com">rcpremierph@gmail.com</a>
          </p>
          <p>
            <a href="tel:+639184291873">+63 918 429 1873</a>
          </p>
          <p>
            <a
              href="https://www.facebook.com/people/RC-Premier-Properties/61588365958516/"
              target="_blank"
              rel="noreferrer"
            >
              Facebook
            </a>
          </p>
        </div>
        <div className="site-footer__bottom">
          <p>© {new Date().getFullYear()} RC Premier Properties</p>
          <p>Serving Pampanga, Philippines, with a focus on Angeles City.</p>
        </div>
      </Container>
    </footer>
  );
}
