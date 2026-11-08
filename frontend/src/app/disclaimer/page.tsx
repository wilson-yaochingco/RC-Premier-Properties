import type { Metadata } from "next";
import heroExterior from "@/assets/site/home_hero.jpg";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/features/legal/LegalPage";
import { OFFICIAL_EMAIL } from "@/lib/public-contact";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Property Disclaimer",
  description:
    "How to read property listings, prices, availability, measurements and photographs on the RC Premier Properties website.",
  canonicalPath: "/disclaimer",
  imagePath: heroExterior.src,
});

const sections: LegalSection[] = [
  {
    id: "purpose",
    title: "What this page covers",
    body: (
      <p>
        Property information on this website is presented to help you start looking.
        This page explains what it can and cannot tell you, so you can decide what to
        confirm before you act on it.
      </p>
    ),
  },
  {
    id: "listing-information",
    title: "Listing information",
    body: (
      <p>
        We prepare each listing with care, but descriptions, features and other details
        may be incomplete, may change, or may contain mistakes. A listing is an
        invitation to inquire, not an offer or a guarantee about the property.
      </p>
    ),
  },
  {
    id: "prices-and-availability",
    title: "Prices and availability",
    body: (
      <p>
        Prices and availability shown online are subject to confirmation and may change
        without notice. A property shown as available may have been reserved or sold
        since the listing was last updated. Ask us to confirm the current price,
        availability and what is included before relying on them.
      </p>
    ),
  },
  {
    id: "measurements-and-descriptions",
    title: "Measurements, specifications and descriptions",
    body: (
      <p>
        Lot areas, floor areas, room counts and other specifications are approximate
        unless a document says otherwise, and descriptions reflect information available
        to us when the listing was prepared. For anything that affects your decision,
        refer to the property’s title and technical documents.
      </p>
    ),
  },
  {
    id: "photographs",
    title: "Photographs and images",
    body: (
      <>
        <p>
          Images are meant to give a fair impression of a property or its surroundings.
          Colours, lighting and finishes can look different in person, and a photograph
          may not show the property’s current condition.
        </p>
        <p>
          Where an image is not a photograph of the listed property, we label it. For
          example, “Development sample — not this listing” marks an illustrative image
          shown in place of the property’s own photographs. We keep those labels on
          listing cards and detail pages so that a sample is never mistaken for the
          actual home.
        </p>
      </>
    ),
  },
  {
    id: "verify-independently",
    title: "Verify independently",
    body: (
      <p>
        Before you commit to a purchase or other transaction, please verify the
        property’s ownership, title, boundaries, taxes, permits, approvals and condition
        yourself, and consider asking a lawyer, a licensed professional or an inspector
        to review them. Information on this website does not replace that checking.
      </p>
    ),
  },
  {
    id: "viewings-and-inquiries",
    title: "Viewings and inquiries",
    body: (
      <p>
        Requesting a viewing or sending an inquiry does not reserve a property or
        confirm an appointment; staff confirmation is required. See our{" "}
        <Link href="/terms">Terms of Use</Link> for what these requests do and do not
        mean.
      </p>
    ),
  },
  {
    id: "professional-disclosures",
    title: "Licenses, accreditations and project disclosures",
    body: (
      <p>
        Nothing on this website should be read as a statement about a professional
        license, a government accreditation or registration, or a particular developer
        status unless it is stated expressly. Where a listing or project needs such
        details disclosed, ask us and we will provide what has been verified.
      </p>
    ),
  },
  {
    id: "questions",
    title: "Questions or corrections",
    body: (
      <p>
        If you notice something in a listing that looks wrong, please tell us at{" "}
        <a href={`mailto:${OFFICIAL_EMAIL}`}>{OFFICIAL_EMAIL}</a> so we can check and
        correct it.
      </p>
    ),
  },
];

export default function DisclaimerPage() {
  return (
    <LegalPage
      title={
        <>
          Property <em>Disclaimer</em>.
        </>
      }
      description="How to read our listings, prices, measurements and photographs, and what to confirm before you decide."
      sections={sections}
    />
  );
}
