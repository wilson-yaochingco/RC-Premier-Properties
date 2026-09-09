import type { Metadata } from "next";
import { AdminDashboard } from "@/features/admin/AdminDashboard";

export const metadata: Metadata = { title: "Operations dashboard" };

export default function AdminPage() {
  return <AdminDashboard />;
}
