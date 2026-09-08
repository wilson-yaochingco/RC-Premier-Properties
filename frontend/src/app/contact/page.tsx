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
      note="Email rcpremierph@gmail.com, call +63 918 429 1873, or use the connected form. Accepted inquiries are saved for staff follow-up."
      formLabel="Start a conversation"
      inquiryType={propertyId ? "property" : "general"}
      source="contact-page"
      propertyId={propertyId}
      submitLabel="Send inquiry"
    />
  );
}
