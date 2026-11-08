"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { RollLabel } from "@/components/ui/RollLabel";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" tabIndex={-1} className="route-state route-state--light">
      <p className="eyebrow">Something went wrong</p>
      <h1>
        We couldn’t load this <em>page</em>
      </h1>
      <p>
        This is usually temporary. Try again, or head back to browse our current
        properties.
      </p>
      <div className="route-state__actions">
        <button type="button" className="button button--primary cta" onClick={retry}>
          <RollLabel>Try again</RollLabel>
          <svg
            aria-hidden="true"
            className="button__icon"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path d="M3 10h13M11 5l5 5-5 5" stroke="currentColor" />
          </svg>
        </button>
        <Button href="/properties" variant="outline">
          Browse properties
        </Button>
      </div>
    </main>
  );
}
