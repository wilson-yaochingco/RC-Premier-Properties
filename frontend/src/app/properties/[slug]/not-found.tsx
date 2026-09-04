import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PropertyNotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="route-state route-state--light">
      <EmptyState
        eyebrow="Property unavailable"
        title="This published property could not be found."
        description="The link may be incorrect, or the listing may no longer be publicly available. Draft, pending and archived listings are never exposed here."
        headingLevel="h1"
      />
      <Button href="/properties" variant="primary">
        Browse properties
      </Button>
    </main>
  );
}
