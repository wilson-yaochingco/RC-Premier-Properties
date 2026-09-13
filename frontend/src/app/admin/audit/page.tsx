import type { Metadata } from "next";
import { AdminAuditViewer } from "@/features/admin/AdminAuditViewer";

export const metadata: Metadata = { title: "Audit events" };
export default function AdminAuditPage() {
  return <AdminAuditViewer />;
}
