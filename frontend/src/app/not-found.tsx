import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="route-state route-state--light">
      <p className="eyebrow">404 · Page not found</p>
      <h1>This address does not lead to a public page.</h1>
      <p>Check the address, browse published properties, or return to the home page.</p>
      <Button href="/properties" variant="primary">
        Browse properties
      </Button>
    </main>
  );
}
