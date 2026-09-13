"use client";

export default function LocationsError({ retry }: { retry: () => void }) {
  return (
    <main id="main-content" tabIndex={-1} className="route-state route-state--light">
      <p className="eyebrow">Location interruption</p>
      <h1>We could not finish loading the location guide.</h1>
      <p>Published property discovery remains available while you retry.</p>
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
