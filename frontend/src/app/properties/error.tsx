"use client";

export default function PropertiesError({ retry }: { retry: () => void }) {
  return (
    <main id="main-content" tabIndex={-1} className="route-state route-state--light">
      <p className="eyebrow">Properties</p>
      <h1>Properties are temporarily unavailable.</h1>
      <p>
        We cannot load the current listings right now. Your filters are kept, so you can
        try again in a moment.
      </p>
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
