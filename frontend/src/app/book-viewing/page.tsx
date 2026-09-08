import type { Metadata } from "next";
import viewingImage from "@/assets/site/book-viewing.png";
import { InquiryPage } from "@/features/inquiries/InquiryPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Book a Property Viewing",
  description:
    "Request a property viewing with RC Premier Properties in Angeles City and Pampanga.",
  canonicalPath: "/book-viewing",
  imagePath: viewingImage.src,
});

export default async function BookViewingPage({
  searchParams,
}: PageProps<"/book-viewing">) {
  const query = await searchParams;
  const rawPropertyId = query.propertyId;
  const propertyId = Array.isArray(rawPropertyId) ? rawPropertyId[0] : rawPropertyId;

  return (
    <InquiryPage
      eyebrow="Viewing request"
      title="See the property with context."
      description="Choose the property and the date and time you would prefer. The team will review your request and contact you about the schedule."
      note="This is a request, not an instant booking. Your appointment is confirmed only after RC Premier Properties contacts you."
      formLabel="Request a viewing"
      inquiryType="viewing"
      source="viewing-page"
      propertyId={propertyId}
      submitLabel="Request viewing"
    />
  );
}
