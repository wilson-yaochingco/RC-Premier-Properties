import type { Metadata } from "next";
import { AdminPropertyList } from "@/features/admin/AdminPropertyList";

export const metadata: Metadata = { title: "Draft properties" };

export default function AdminPropertiesPage() {
  return <AdminPropertyList />;
}
