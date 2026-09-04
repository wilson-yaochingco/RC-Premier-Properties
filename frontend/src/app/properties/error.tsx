"use client";

export default function PropertiesError({ retry }: { retry: () => void }) {
  return (
    <main id="main-content" tabIndex={-1} className="route-state route-state--light">
      <p className="eyebrow">Catalogue interruption</p>
      <h1>We could not finish loading this property.</h1>
      <p>Your filters and page remain available. Retry when the API is reachable.</p>
      <button
        type="button"
        className="button button--primary route-state__button"
        onClick={retry}
      >
        <span>Try again</span>
        <span aria-hidden="true">→</span>
      </button>
    </main>
  );
}
