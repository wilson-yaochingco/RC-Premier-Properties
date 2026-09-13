import type { Metadata } from "next";
import { AdminPropertyList } from "@/features/admin/AdminPropertyList";

export const metadata: Metadata = { title: "Property administration" };

export default function AdminPropertiesPage() {
  return <AdminPropertyList />;
}
