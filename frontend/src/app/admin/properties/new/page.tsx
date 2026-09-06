import type { Metadata } from "next";
import { AdminPropertyForm } from "@/features/admin/AdminPropertyForm";

export const metadata: Metadata = { title: "Create property draft" };

export default function NewAdminPropertyPage() {
  return <AdminPropertyForm mode="create" />;
}
