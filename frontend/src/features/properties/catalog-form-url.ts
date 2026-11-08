/**
 * Canonical `/properties` URL for a submitted filter form. Empty fields are dropped, so
 * "All" selections and blank inputs never appear in the URL; hidden context (`purpose`,
 * `sort`, and the development `catalogFixture`) travels with every submission and `page`
 * is never carried over, so a new filter always starts at page 1.
 */
export function catalogFormHref(
  entries: Iterable<[string, FormDataEntryValue]>,
  basePath = "/properties",
): string {
  const params = new URLSearchParams();
  for (const [key, value] of entries) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) params.append(key, trimmed);
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
