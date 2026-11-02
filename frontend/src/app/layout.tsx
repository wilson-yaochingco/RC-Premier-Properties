import type { Metadata } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import heroExterior from "@/assets/site/home_hero.jpg";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PublicChrome } from "@/components/layout/PublicChrome";
import { PublicScroll } from "@/components/layout/PublicScroll";
import { RequestTourProvider } from "@/features/inquiries/RequestTourProvider";
import { SITE_URL } from "@/lib/env";
import { buildPageMetadata } from "@/lib/seo";
import "./globals.css";
import "lenis/dist/lenis.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
  display: "swap",
});

const rootMetadata = buildPageMetadata({
  title: "RC Premier Properties | Houses for Sale in Pampanga",
  description:
    "Browse houses and residential properties for sale in Pampanga with RC Premier Properties.",
  canonicalPath: "/",
  imagePath: heroExterior.src,
});

export const metadata: Metadata = {
  ...rootMetadata,
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: {
    default: "RC Premier Properties | Houses for Sale in Pampanga",
    template: "%s | RC Premier Properties",
  },
  applicationName: "RC Premier Properties",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${manrope.variable} ${instrumentSerif.variable}`}>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <PublicScroll>
          <RequestTourProvider>
            <PublicChrome>
              <SiteHeader />
            </PublicChrome>
            {children}
            <PublicChrome>
              <SiteFooter />
            </PublicChrome>
          </RequestTourProvider>
        </PublicScroll>
      </body>
    </html>
  );
}
