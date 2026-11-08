import type { Metadata } from "next";
import { Instrument_Serif, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import heroExterior from "@/assets/site/home_hero.jpg";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PublicChrome } from "@/components/layout/PublicChrome";
import { PublicScroll } from "@/components/layout/PublicScroll";
import { PageTransition } from "@/components/layout/PageTransition";
import { RequestTourProvider } from "@/features/inquiries/RequestTourProvider";
import { SITE_URL } from "@/lib/env";
import { buildPageMetadata } from "@/lib/seo";
import "./globals.css";
import "lenis/dist/lenis.css";

// The one variable file covers weights 200-700; no italic is bundled, the accent is Playfair.
const generalSans = localFont({
  src: "../assets/fonts/GeneralSans-Variable.woff2",
  variable: "--font-general-sans",
  weight: "200 700",
  display: "swap",
  adjustFontFallback: "Arial",
});

// Editorial accent for a few headline words (`h1 em`, `h2 em`, `h3 em`); one weight only.
const playfair = Playfair_Display({
  subsets: ["latin"],
  style: "italic",
  weight: "500",
  variable: "--font-playfair",
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
    "Browse houses, townhouses and lots for sale across Pampanga with RC Premier Properties, then ask about a listing or request a viewing.",
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

const INTRO_BOOTSTRAP = `try{var d=document.documentElement,s=sessionStorage;if(location.pathname.indexOf("/admin")!==0&&!s.getItem("rc-intro-seen")){s.setItem("rc-intro-seen","1");if(location.pathname==="/"&&!matchMedia("(prefers-reduced-motion: reduce)").matches)d.dataset.intro="play"}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* A tab's first page load decides the Home intro before first paint; HomeIntro ends it. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOTSTRAP }} />
      </head>
      <body
        className={`${generalSans.variable} ${playfair.variable} ${instrumentSerif.variable}`}
      >
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
        <PageTransition />
      </body>
    </html>
  );
}
