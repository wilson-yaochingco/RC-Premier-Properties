import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RC Premier Properties",
    template: "%s | RC Premier Properties",
  },
  description:
    "Explore property opportunities in Angeles City and Pampanga with RC Premier Properties.",
  applicationName: "RC Premier Properties",
  alternates: { canonical: "/" },
  openGraph: {
    title: "RC Premier Properties",
    description:
      "A considered property discovery experience for Angeles City and Pampanga.",
    type: "website",
    siteName: "RC Premier Properties",
    locale: "en_PH",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "RC Premier Properties",
    description:
      "A considered property discovery experience for Angeles City and Pampanga.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
