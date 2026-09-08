import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PublicChrome } from "@/components/layout/PublicChrome";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RC Premier Properties",
    template: "%s | RC Premier Properties",
  },
  description:
    "Browse houses and residential properties for sale in Pampanga with RC Premier Properties.",
  applicationName: "RC Premier Properties",
  alternates: { canonical: "/" },
  openGraph: {
    title: "RC Premier Properties",
    description: "Browse houses and residential properties for sale in Pampanga.",
    type: "website",
    siteName: "RC Premier Properties",
    locale: "en_PH",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "RC Premier Properties",
    description: "Browse houses and residential properties for sale in Pampanga.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <PublicChrome>
          <SiteHeader />
        </PublicChrome>
        {children}
        <PublicChrome>
          <SiteFooter />
        </PublicChrome>
      </body>
    </html>
  );
}
