import type { Metadata } from "next";
import { AdminSearch } from "@/features/admin/AdminSearch";

export const metadata: Metadata = { title: "Search administration" };
export default function AdminSearchPage() {
  return <AdminSearch />;
}
