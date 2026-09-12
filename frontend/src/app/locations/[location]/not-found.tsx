import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Location not found",
  alternates: { canonical: null },
  robots: { index: false, follow: false, noarchive: true },
};

export default function LocationNotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="route-state route-state--light">
      <EmptyState
        eyebrow="Location unavailable"
        title="This published location could not be found."
        description="Location guides appear for areas with current published homes for sale."
        headingLevel="h1"
      />
      <Button href="/locations" variant="primary">
        Browse locations
      </Button>
    </main>
  );
}
