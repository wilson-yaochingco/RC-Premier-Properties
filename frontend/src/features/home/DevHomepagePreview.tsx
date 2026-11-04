import { Suspense } from "react";

async function DevHomepagePreviewToolbar() {
  // The literal `NODE_ENV` check is folded by Next, so production builds drop the dynamic
  // import (and the toolbar and its styles) entirely.
  if (process.env.NODE_ENV !== "development") return null;
  const { HomepagePreviewSwitcher } = await import("./HomepagePreviewSwitcher");
  return <HomepagePreviewSwitcher />;
}

/** Development-only fixture toolbar for homepage, catalog, Book a Viewing and Contact previews. */
export function DevHomepagePreview() {
  return (
    <Suspense fallback={null}>
      <DevHomepagePreviewToolbar />
    </Suspense>
  );
}
