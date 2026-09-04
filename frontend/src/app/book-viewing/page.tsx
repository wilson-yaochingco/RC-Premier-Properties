import type { Metadata } from "next";
import { InquiryPage } from "@/features/inquiries/InquiryPage";

export const metadata: Metadata = {
  title: "Request a Viewing",
  description:
    "Request a property viewing with RC Premier Properties in Angeles City and Pampanga.",
  alternates: { canonical: "/book-viewing" },
};

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
      description="Share the Property ID and your preferred timing in the message. The request will be stored for follow-up by the team."
      note="This form requests a viewing; it does not confirm a date or guarantee current availability. Scheduling is complete only after direct confirmation."
      formLabel="Request a viewing"
      inquiryType="viewing"
      source="viewing-page"
      propertyId={propertyId}
      submitLabel="Request viewing"
    />
  );
}
