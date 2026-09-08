import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { BrandLogo } from "./BrandLogo";
import { MobileNavigation } from "./MobileNavigation";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/properties", label: "Properties" },
  { href: "/#locations", label: "Locations" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <Container className="site-header__inner">
        <BrandLogo />

        <nav className="desktop-navigation" aria-label="Primary navigation">
          <ul>
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <Button href="/book-viewing" variant="outline" className="site-header__cta">
          Book a Viewing
        </Button>

        <MobileNavigation items={navigation} />
      </Container>
    </header>
  );
}
