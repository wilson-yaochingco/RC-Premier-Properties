import {
  API_PREFIX,
  type AdminPropertyAvailabilityRequest,
  type AdminPropertyDetail,
  type AdminPropertyListRequest,
  type AdminPropertyListResponse,
  type AdminPropertyTransitionRequest,
  type CreateDraftPropertyRequest,
  type CurrentSessionResponse,
  type LogoutResponse,
  type UpdateDraftPropertyRequest,
} from "@rc/shared";
import { apiRequest } from "@/services/api-client";

const authenticatedRequest = (signal?: AbortSignal): RequestInit => ({
  credentials: "include",
  cache: "no-store",
  ...(signal ? { signal } : {}),
});

export function getCurrentSession(signal?: AbortSignal) {
  return apiRequest<CurrentSessionResponse>(
    `${API_PREFIX}/auth/session`,
    authenticatedRequest(signal),
  );
}

export function getAdminProperties(
  request: AdminPropertyListRequest,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    page: String(request.page),
    limit: String(request.limit),
  });
  if (request.query) query.set("query", request.query);
  if (request.publicationStatus) {
    query.set("publicationStatus", request.publicationStatus);
  }
  if (request.availability) query.set("availability", request.availability);
  return apiRequest<AdminPropertyListResponse>(
    `${API_PREFIX}/admin/properties?${query.toString()}`,
    authenticatedRequest(signal),
  );
}

function lifecycleRequest(
  id: string,
  action: "publish" | "unpublish" | "archive" | "restore",
  body: AdminPropertyTransitionRequest,
  csrfToken: string,
) {
  return apiRequest<AdminPropertyDetail>(
    `${API_PREFIX}/admin/properties/${encodeURIComponent(id)}/${action}`,
    { ...writeRequest(body, csrfToken), method: "POST" },
  );
}

export function transitionAdminProperty(
  id: string,
  action: "publish" | "unpublish" | "archive" | "restore",
  expectedVersion: number,
  csrfToken: string,
) {
  return lifecycleRequest(id, action, { expectedVersion }, csrfToken);
}

export function changeAdminPropertyAvailability(
  id: string,
  body: AdminPropertyAvailabilityRequest,
  csrfToken: string,
) {
  return apiRequest<AdminPropertyDetail>(
    `${API_PREFIX}/admin/properties/${encodeURIComponent(id)}/availability`,
    { ...writeRequest(body, csrfToken), method: "PATCH" },
  );
}

export function getAdminProperty(id: string, signal?: AbortSignal) {
  return apiRequest<AdminPropertyDetail>(
    `${API_PREFIX}/admin/properties/${encodeURIComponent(id)}`,
    authenticatedRequest(signal),
  );
}

function writeRequest(body: unknown, csrfToken: string): RequestInit {
  return {
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(body),
  };
}

export function createDraftProperty(
  body: CreateDraftPropertyRequest,
  csrfToken: string,
) {
  return apiRequest<AdminPropertyDetail>(`${API_PREFIX}/admin/properties`, {
    ...writeRequest(body, csrfToken),
    method: "POST",
  });
}

export function updateDraftProperty(
  id: string,
  body: UpdateDraftPropertyRequest,
  csrfToken: string,
) {
  return apiRequest<AdminPropertyDetail>(
    `${API_PREFIX}/admin/properties/${encodeURIComponent(id)}`,
    {
      ...writeRequest(body, csrfToken),
      method: "PATCH",
    },
  );
}

export function logout(csrfToken: string) {
  return apiRequest<LogoutResponse>(`${API_PREFIX}/auth/logout`, {
    ...writeRequest({}, csrfToken),
    method: "POST",
  });
}
