import type { Metadata } from "next";
import heroExterior from "@/assets/site/home_hero.jpg";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/features/legal/LegalPage";
import { OFFICIAL_EMAIL } from "@/lib/public-contact";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Use",
  description:
    "The terms for using the RC Premier Properties website, including property listings, inquiries and viewing requests.",
  canonicalPath: "/terms",
  imagePath: heroExterior.src,
});

const sections: LegalSection[] = [
  {
    id: "about-this-website",
    title: "About this website",
    body: (
      <p>
        This website is operated by RC Premier Properties to present residential
        properties and locations in Pampanga, Philippines, and to let visitors ask about
        a property, request a viewing or tell us about a property they may want to sell.
        By using the website you agree to these terms. If you do not agree with them,
        please do not use it.
      </p>
    ),
  },
  {
    id: "using-the-website",
    title: "Using the website",
    body: (
      <>
        <p>
          You are welcome to browse the website and use its forms for genuine inquiries.
          Please give accurate contact details, and do not use the website to send spam,
          interfere with how it works, attempt to access areas meant for our staff, or
          copy its content in bulk with automated tools.
        </p>
        <p>
          How we handle the information you send is described in our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: "property-information",
    title: "Property listings and information",
    body: (
      <p>
        Listings, locations and other content are provided for general information. We
        work to keep them accurate and current, but details can change or contain
        errors. Please read our <Link href="/disclaimer">Property Disclaimer</Link> for
        how to treat prices, availability, measurements and photographs, and verify what
        matters to you before making a decision.
      </p>
    ),
  },
  {
    id: "inquiries-and-viewings",
    title: "Inquiries and viewing requests",
    body: (
      <>
        <p>
          Sending an inquiry or choosing a date and time for a viewing is a request. It
          does not reserve a property, confirm an appointment or create an agreement of
          any kind. A viewing is arranged only when our staff confirm it with you, and
          we may suggest a different time.
        </p>
        <p>
          A seller inquiry is a way to start a conversation. It is not a valuation, a
          listing agreement or an offer, and it does not mean we will list or sell your
          property. The website does not process payments or complete property
          transactions.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "Intellectual property",
    body: (
      <p>
        The RC Premier Properties name and logo, and the text, design, photographs and
        videos on this website, belong to us or to those who license them to us. You may
        view them and share links to the website for personal, non-commercial use.
        Please do not copy, republish or use them commercially without our written
        permission.
      </p>
    ),
  },
  {
    id: "third-party-services",
    title: "External websites and services",
    body: (
      <p>
        The website links to services we do not control, such as our social media
        profiles, embedded videos and map providers. They have their own terms and
        privacy practices, and we are not responsible for their content or conduct.
      </p>
    ),
  },
  {
    id: "limits",
    title: "Limits and qualifications",
    body: (
      <>
        <p>
          We provide the website on an “as is” and “as available” basis and do not
          promise that it will always be uninterrupted or free of errors. Nothing on it
          is legal, financial, tax or engineering advice.
        </p>
        <p>
          Nothing in these terms limits any rights you have under Philippine law that
          cannot lawfully be limited, including consumer and data privacy rights, or
          responsibility that cannot lawfully be excluded.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    body: (
      <p>
        We may update the website and these terms from time to time. The date at the top
        shows when they were last revised, and continuing to use the website after a
        change means you accept the updated terms.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of the Republic of the Philippines. Any
        dispute that cannot be settled amicably is for the competent courts of the
        Philippines.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        For questions about these terms, or to raise a concern or dispute, email{" "}
        <a href={`mailto:${OFFICIAL_EMAIL}`}>{OFFICIAL_EMAIL}</a> or use our{" "}
        <Link href="/contact">contact page</Link>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title={
        <>
          Terms of <em>Use</em>.
        </>
      }
      description="The simple ground rules for using our website, and what an inquiry or viewing request does and does not mean."
      sections={sections}
    />
  );
}
