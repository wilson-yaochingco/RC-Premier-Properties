import {
  API_PREFIX,
  type AddInquiryNoteRequest,
  type AdminInquiryDetail,
  type AdminInquiryListRequest,
  type AdminInquiryListResponse,
  type AdminInquiryTransitionRequest,
  type AdminAuditListRequest,
  type AdminAuditListResponse,
  type AdminDashboardResponse,
  type AdminPropertyAvailabilityRequest,
  type AdminPropertyDetail,
  type AdminPropertyListRequest,
  type AdminPropertyListResponse,
  type AdminPropertyTransitionRequest,
  type AdminStaffListRequest,
  type AdminStaffListResponse,
  type AdminViewingCalendarResponse,
  type CreateDraftPropertyRequest,
  type CurrentSessionResponse,
  type LogoutResponse,
  type UpdateDraftPropertyRequest,
  type UpdateInquiryStatusRequest,
  type UpdatePropertyMediaRequest,
  type UpdateViewingRequestRequest,
} from "@rc/shared";
import { API_BASE_URL } from "@/lib/env";
import { ApiClientError, apiRequest } from "@/services/api-client";

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

export function getAdminInquiries(
  request: AdminInquiryListRequest,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    queue: request.queue,
    page: String(request.page),
    limit: String(request.limit),
  });
  if (request.query) query.set("query", request.query);
  if (request.status) query.set("status", request.status);
  if (request.inquiryType) query.set("inquiryType", request.inquiryType);
  if (request.source) query.set("source", request.source);
  if (request.propertyId) query.set("propertyId", request.propertyId);
  if (request.viewingStatus) query.set("viewingStatus", request.viewingStatus);
  return apiRequest<AdminInquiryListResponse>(
    `${API_PREFIX}/admin/inquiries?${query.toString()}`,
    authenticatedRequest(signal),
  );
}

export function getAdminInquiry(id: string, signal?: AbortSignal) {
  return apiRequest<AdminInquiryDetail>(
    `${API_PREFIX}/admin/inquiries/${encodeURIComponent(id)}`,
    authenticatedRequest(signal),
  );
}

export function getAdminDashboard(signal?: AbortSignal) {
  return apiRequest<AdminDashboardResponse>(
    `${API_PREFIX}/admin/operations/dashboard`,
    authenticatedRequest(signal),
  );
}

export function getAdminViewingCalendar(
  start: string,
  end: string,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({ start, end });
  return apiRequest<AdminViewingCalendarResponse>(
    `${API_PREFIX}/admin/operations/viewings/calendar?${query.toString()}`,
    authenticatedRequest(signal),
  );
}

export function getAdminAuditEvents(
  request: AdminAuditListRequest,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    page: String(request.page),
    limit: String(request.limit),
  });
  if (request.action) query.set("action", request.action);
  if (request.entityType) query.set("entityType", request.entityType);
  if (request.outcome) query.set("outcome", request.outcome);
  if (request.actorStaffIdentityId) {
    query.set("actorStaffIdentityId", request.actorStaffIdentityId);
  }
  if (request.from) query.set("from", request.from);
  if (request.to) query.set("to", request.to);
  return apiRequest<AdminAuditListResponse>(
    `${API_PREFIX}/admin/operations/audit-events?${query.toString()}`,
    authenticatedRequest(signal),
  );
}

export function getAdminStaff(request: AdminStaffListRequest, signal?: AbortSignal) {
  const query = new URLSearchParams({
    page: String(request.page),
    limit: String(request.limit),
  });
  if (request.query) query.set("query", request.query);
  if (request.status) query.set("status", request.status);
  return apiRequest<AdminStaffListResponse>(
    `${API_PREFIX}/admin/operations/staff?${query.toString()}`,
    authenticatedRequest(signal),
  );
}

export function updateAdminInquiryStatus(
  id: string,
  body: UpdateInquiryStatusRequest,
  csrfToken: string,
) {
  return apiRequest<AdminInquiryDetail>(
    `${API_PREFIX}/admin/inquiries/${encodeURIComponent(id)}/status`,
    { ...writeRequest(body, csrfToken), method: "PATCH" },
  );
}

export function updateAdminViewingRequest(
  id: string,
  body: UpdateViewingRequestRequest,
  csrfToken: string,
) {
  return apiRequest<AdminInquiryDetail>(
    `${API_PREFIX}/admin/inquiries/${encodeURIComponent(id)}/viewing`,
    { ...writeRequest(body, csrfToken), method: "PATCH" },
  );
}

export function addAdminInquiryNote(
  id: string,
  body: AddInquiryNoteRequest,
  csrfToken: string,
) {
  return apiRequest<AdminInquiryDetail>(
    `${API_PREFIX}/admin/inquiries/${encodeURIComponent(id)}/notes`,
    { ...writeRequest(body, csrfToken), method: "POST" },
  );
}

export function transitionAdminInquiry(
  id: string,
  action: "spam" | "not-spam" | "archive" | "restore",
  body: AdminInquiryTransitionRequest,
  csrfToken: string,
) {
  return apiRequest<AdminInquiryDetail>(
    `${API_PREFIX}/admin/inquiries/${encodeURIComponent(id)}/${action}`,
    { ...writeRequest(body, csrfToken), method: "POST" },
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

export function updatePropertyMedia(
  id: string,
  body: UpdatePropertyMediaRequest,
  csrfToken: string,
) {
  return apiRequest<AdminPropertyDetail>(
    `${API_PREFIX}/admin/properties/${encodeURIComponent(id)}/media`,
    {
      ...writeRequest(body, csrfToken),
      method: "PUT",
    },
  );
}

export function uploadPropertyImage(
  id: string,
  expectedVersion: number,
  file: File,
  alt: string,
  caption: string,
  csrfToken: string,
  onProgress: (percent: number) => void,
): Promise<AdminPropertyDetail> {
  const query = new URLSearchParams({ expectedVersion: String(expectedVersion), alt });
  if (caption.trim()) query.set("caption", caption.trim());
  const url = `${API_BASE_URL}${API_PREFIX}/admin/properties/${encodeURIComponent(id)}/media/uploads?${query.toString()}`;

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url);
    request.timeout = 30_000;
    request.withCredentials = true;
    request.setRequestHeader("Accept", "application/json");
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader("X-CSRF-Token", csrfToken);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onerror = () =>
      reject(
        new ApiClientError({
          status: "error",
          statusCode: 0,
          message: "Unable to reach the API.",
        }),
      );
    request.ontimeout = () =>
      reject(
        new ApiClientError({
          status: "error",
          statusCode: 0,
          message: "Image upload timed out. Try again after checking the property.",
        }),
      );
    request.onload = () => {
      let body: unknown;
      try {
        body = JSON.parse(request.responseText) as unknown;
      } catch {
        body = undefined;
      }
      if (request.status >= 200 && request.status < 300 && body) {
        resolve(body as AdminPropertyDetail);
        return;
      }
      const error = body as { statusCode?: unknown; message?: unknown } | undefined;
      reject(
        new ApiClientError({
          status: "error",
          statusCode:
            typeof error?.statusCode === "number" ? error.statusCode : request.status,
          message:
            typeof error?.message === "string" ? error.message : "Image upload failed.",
        }),
      );
    };
    request.send(file);
  });
}

export function logout(csrfToken: string) {
  return apiRequest<LogoutResponse>(`${API_PREFIX}/auth/logout`, {
    ...writeRequest({}, csrfToken),
    method: "POST",
  });
}
