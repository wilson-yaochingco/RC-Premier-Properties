import type { Metadata } from "next";
import { InquiryPage } from "@/features/inquiries/InquiryPage";

export const metadata: Metadata = {
  title: "Sell a Property",
  description:
    "Start a private property-selling conversation with RC Premier Properties in Pampanga.",
  alternates: { canonical: "/sell" },
};

export default function SellPage() {
  return (
    <InquiryPage
      eyebrow="For property owners"
      title="Start with a considered conversation."
      description="Share the essentials about the property you may want to sell. This first step is intentionally simple and does not ask you to upload private ownership or identity documents."
      note="Submitting this form starts an inquiry only. It is not a valuation, listing agreement, offer, approval or promise that a property will be published."
      formLabel="Seller inquiry"
      inquiryType="selling"
      source="sell-page"
      submitLabel="Start the conversation"
    />
  );
}
