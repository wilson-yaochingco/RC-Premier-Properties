import type { Metadata } from "next";
import { AdminShell } from "@/features/admin/AdminShell";

export const metadata: Metadata = {
  title: "Staff administration",
  robots: { index: false, follow: false, noarchive: true },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
