import type { Metadata } from "next";
import { AdminInquiryDetailView } from "@/features/admin/AdminInquiryDetail";

export const metadata: Metadata = { title: "Inquiry details" };

export default async function AdminInquiryDetailPage({
  params,
}: PageProps<"/admin/inquiries/[id]">) {
  const { id } = await params;
  return <AdminInquiryDetailView inquiryId={id} />;
}
