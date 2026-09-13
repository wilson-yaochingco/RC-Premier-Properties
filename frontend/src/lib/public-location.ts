const PAMPANGA_SUFFIX = /,\s*pampanga$/i;
const PUBLIC_LOCATION_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

export function publicLocationPath(location: string): string {
  return `/locations/${publicLocationSlug(location)}`;
}

export function findPublicLocationBySlug<T extends { location: string }>(
  slug: string,
  locations: readonly T[],
): T | undefined {
  if (!PUBLIC_LOCATION_SLUG.test(slug)) return undefined;
  return locations.find(({ location }) => publicLocationSlug(location) === slug);
}
