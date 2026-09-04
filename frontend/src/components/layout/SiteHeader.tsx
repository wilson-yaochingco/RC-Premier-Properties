import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { MobileNavigation } from "./MobileNavigation";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/properties", label: "Properties" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <Container className="site-header__inner">
        <Link
          href="/"
          className="brand-name-slot"
          aria-label="RC Premier Properties home"
          data-brand-slot="text"
        >
          <span>RC Premier</span>
          <span>Properties</span>
        </Link>

        <nav className="desktop-navigation" aria-label="Primary navigation">
          <ul>
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <Button href="/contact" variant="outline" className="site-header__cta">
          Enquire
        </Button>

        <MobileNavigation items={navigation} />
      </Container>
    </header>
  );
}
