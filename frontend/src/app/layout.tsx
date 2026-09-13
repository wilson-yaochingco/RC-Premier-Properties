import type { Metadata } from "next";
import heroExterior from "@/assets/site/home-hero-level18.jpg";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PublicChrome } from "@/components/layout/PublicChrome";
import { RequestTourProvider } from "@/features/inquiries/RequestTourProvider";
import { SITE_URL } from "@/lib/env";
import { buildPageMetadata } from "@/lib/seo";
import "./globals.css";

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
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <RequestTourProvider>
          <PublicChrome>
            <SiteHeader />
          </PublicChrome>
          {children}
          <PublicChrome>
            <SiteFooter />
          </PublicChrome>
        </RequestTourProvider>
      </body>
    </html>
  );
}
