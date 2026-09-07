import type { Metadata } from "next";
import { AdminInquiryList } from "@/features/admin/AdminInquiryList";

export const metadata: Metadata = { title: "Inquiry management" };

export default function AdminInquiriesPage() {
  return <AdminInquiryList />;
}
