const PAMPANGA_SUFFIX = /,\s*pampanga$/i;

export function shortPublicLocation(location: string): string {
  return location.trim().replace(PAMPANGA_SUFFIX, "");
}

export function publicLocationSlug(location: string): string {
  return shortPublicLocation(location)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function publicLocationCatalogPath(location: string): string {
  return `/properties?${new URLSearchParams({ location: shortPublicLocation(location) })}`;
}
