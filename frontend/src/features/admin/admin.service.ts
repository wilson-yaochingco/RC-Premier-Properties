import {
  API_PREFIX,
  type AdminPropertyDetail,
  type AdminPropertyListResponse,
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

export function getAdminProperties(signal?: AbortSignal) {
  return apiRequest<AdminPropertyListResponse>(
    `${API_PREFIX}/admin/properties?publicationStatus=draft&page=1&limit=25`,
    authenticatedRequest(signal),
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
