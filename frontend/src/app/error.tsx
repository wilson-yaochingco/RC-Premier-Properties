"use client";

export default function AppError({ retry }: { retry: () => void }) {
  return (
    <main id="main-content" tabIndex={-1} className="route-state route-state--light">
      <p className="eyebrow">Unexpected interruption</p>
      <h1>Something prevented this page from loading.</h1>
      <p>
        Try the request again. If the problem continues, return to the property list.
      </p>
      <button type="button" className="button button--primary" onClick={retry}>
        <span>Try again</span>
        <span aria-hidden="true">→</span>
      </button>
    </main>
  );
}
