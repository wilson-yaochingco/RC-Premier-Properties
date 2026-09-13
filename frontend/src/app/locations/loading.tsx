export default function LocationsLoading() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="route-state route-state--light"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="eyebrow">Location guide</p>
      <h1>Preparing published locations…</h1>
      <div className="loading-rule" aria-hidden="true" />
    </main>
  );
}
