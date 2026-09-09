import type { Metadata } from "next";
import { AdminStaffList } from "@/features/admin/AdminStaffList";

export const metadata: Metadata = { title: "Staff identities" };
export default function AdminStaffPage() {
  return <AdminStaffList />;
}
