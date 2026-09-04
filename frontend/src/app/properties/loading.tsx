export default function PropertiesLoading() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="route-state route-state--light"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="eyebrow">Property catalogue</p>
      <h1>Preparing published listings…</h1>
      <div className="loading-rule" aria-hidden="true" />
    </main>
  );
}
