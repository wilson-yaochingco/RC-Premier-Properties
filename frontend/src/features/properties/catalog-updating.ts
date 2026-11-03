/**
 * Flags the page while a filter change is loading. CSS dims the current results and shows
 * the small "Updating…" note; the previous results stay on screen until the new ones land.
 */
export function markCatalogUpdating(from: Element | null, updating: boolean): void {
  const page = from?.closest("main");
  if (!page) return;
  if (updating) {
    page.dataset.updating = "true";
    page.setAttribute("aria-busy", "true");
  } else {
    delete page.dataset.updating;
    page.removeAttribute("aria-busy");
  }
}
