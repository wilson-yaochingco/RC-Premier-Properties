import type { ApiErrorResponse } from "@rc/shared";
import { API_BASE_URL } from "@/lib/env";

/** Error returned for a non-successful response from the backend API. */
export class ApiClientError extends Error {
  readonly statusCode: number;
  readonly response: ApiErrorResponse;

  constructor(response: ApiErrorResponse, options?: ErrorOptions) {
    super(response.message, options);
    this.name = "ApiClientError";
    this.statusCode = response.statusCode;
    this.response = response;
  }
}

function requestUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Partial<ApiErrorResponse>;
  return (
    candidate.status === "error" &&
    typeof candidate.statusCode === "number" &&
    typeof candidate.message === "string"
  );
}

async function readErrorResponse(response: Response): Promise<ApiErrorResponse> {
  try {
    const body: unknown = await response.json();
    if (isApiErrorResponse(body)) return body;
  } catch {
    // The fallback below also covers empty and non-JSON error responses.
  }

  return {
    status: "error",
    statusCode: response.status,
    message: response.statusText || "The API request failed.",
  };
}

/**
 * Send a request to the configured backend and decode its JSON response.
 *
 * Callers supply the expected shared response type. Non-2xx responses are normalized
 * to `ApiClientError`, whose `response` follows the shared API error contract.
 */
export async function apiRequest<TResponse>(
  path: string,
  init: RequestInit = {},
): Promise<TResponse> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  let response: Response;

  try {
    response = await fetch(requestUrl(path), { ...init, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;

    throw new ApiClientError(
      {
        status: "error",
        statusCode: 0,
        message: "Unable to reach the API.",
      },
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new ApiClientError(await readErrorResponse(response));
  }

  if (response.status === 204) return undefined as TResponse;

  try {
    return (await response.json()) as TResponse;
  } catch (error) {
    throw new ApiClientError(
      {
        status: "error",
        statusCode: 502,
        message: "The API returned an invalid JSON response.",
      },
      { cause: error },
    );
  }
}
