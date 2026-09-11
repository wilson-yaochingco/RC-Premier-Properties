import type { Metadata } from "next";
import viewingImage from "@/assets/site/book-viewing.png";
import { Button } from "@/components/ui/Button";
import { LegacyViewingLauncher } from "@/features/inquiries/RequestTourProvider";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Request a Property Tour",
  description:
    "Request a property tour with RC Premier Properties in Pampanga. Requested schedules require staff confirmation.",
  canonicalPath: "/book-viewing",
  imagePath: viewingImage.src,
});

export default async function BookViewingPage({
  searchParams,
}: PageProps<"/book-viewing">) {
  const query = await searchParams;
  const rawPropertyId = query.propertyId;
  const propertyId = Array.isArray(rawPropertyId) ? rawPropertyId[0] : rawPropertyId;

  return (
    <main id="main-content" tabIndex={-1} className="route-state">
      <p className="eyebrow">Legacy viewing link</p>
      <h1>Request a Tour</h1>
      <p>
        The Request a Tour dialog opens from this compatible route. A submitted time is
        a request and still requires staff confirmation.
      </p>
      <LegacyViewingLauncher propertyId={propertyId} />
      <Button href="/properties" variant="outline" className="route-state__button">
        Browse properties
      </Button>
    </main>
  );
}
