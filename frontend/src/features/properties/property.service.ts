import {
  API_PREFIX,
  type PropertyFacetsResponse,
  type PropertySearchResponse,
  type PublicPropertyDetail,
} from "@rc/shared";
import { apiRequest } from "@/services/api-client";
import { propertyApiSearchParams, type RawSearchParams } from "./property-query";

const READ_TIMEOUT_MS = 8_000;

function readOptions(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    cache: init.cache ?? "no-store",
    signal: init.signal ?? AbortSignal.timeout(READ_TIMEOUT_MS),
  };
}

export function getProperties(
  searchParams: RawSearchParams,
  init?: RequestInit,
): Promise<PropertySearchResponse> {
  const query = propertyApiSearchParams(searchParams);
  return apiRequest<PropertySearchResponse>(
    `${API_PREFIX}/properties?${query.toString()}`,
    readOptions(init),
  );
}

export function getFeaturedProperties(
  init?: RequestInit,
): Promise<PropertySearchResponse> {
  const query = new URLSearchParams({
    featured: "true",
    sort: "newest",
    page: "1",
    limit: "3",
  });

  return apiRequest<PropertySearchResponse>(
    `${API_PREFIX}/properties?${query.toString()}`,
    readOptions(init),
  );
}

export function getPropertyFacets(init?: RequestInit): Promise<PropertyFacetsResponse> {
  return apiRequest<PropertyFacetsResponse>(
    `${API_PREFIX}/properties/facets`,
    readOptions(init),
  );
}

export function getPropertyBySlug(
  slug: string,
  init?: RequestInit,
): Promise<PublicPropertyDetail> {
  return apiRequest<PublicPropertyDetail>(
    `${API_PREFIX}/properties/${encodeURIComponent(slug)}`,
    readOptions(init),
  );
}
