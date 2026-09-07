import type { Metadata } from "next";
import { AdminPropertyPreview } from "@/features/admin/AdminPropertyPreview";

export const metadata: Metadata = { title: "Preview property" };

export default async function PreviewAdminPropertyPage({
  params,
}: PageProps<"/admin/properties/[id]/preview">) {
  const { id } = await params;
  return <AdminPropertyPreview propertyId={id} />;
}
