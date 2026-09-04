import type { Metadata } from "next";
import { InquiryPage } from "@/features/inquiries/InquiryPage";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Send a property or general inquiry to RC Premier Properties in Angeles City, Pampanga.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const query = await searchParams;
  const rawPropertyId = query.propertyId;
  const propertyId = Array.isArray(rawPropertyId) ? rawPropertyId[0] : rawPropertyId;

  return (
    <InquiryPage
      eyebrow="Contact"
      title="Let’s talk about your next move."
      description="Tell us what you are looking for, or share the Property ID that brought you here. Submit the form to request a direct follow-up."
      note="RC Premier Properties is focused on Angeles City and the wider Pampanga market. Approved phone, email and office details have not yet been supplied, so this connected form is the current contact channel."
      formLabel="Start a conversation"
      inquiryType={propertyId ? "property" : "general"}
      source="contact-page"
      propertyId={propertyId}
      submitLabel="Send inquiry"
    />
  );
}
