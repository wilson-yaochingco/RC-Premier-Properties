import type { Metadata } from "next";
import { AdminPropertyForm } from "@/features/admin/AdminPropertyForm";

export const metadata: Metadata = { title: "Edit property draft" };

export default async function EditAdminPropertyPage({
  params,
}: PageProps<"/admin/properties/[id]/edit">) {
  const { id } = await params;
  return <AdminPropertyForm mode="edit" propertyId={id} />;
}
