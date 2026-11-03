"use client";

import { useCallback, useRef, useState } from "react";
import {
  VIEWING_REQUEST_TIMES,
  type CreateInquiryRequest,
  type ValidationIssue,
} from "@rc/shared";
import { ApiClientError } from "../../services/api-client";
import { createInquiry } from "./inquiry.service";

/**
 * The single source of the viewing-request business rules, shared by the Request a Tour
 * dialog and the inline Book a Viewing scheduler. Presentation lives with each surface;
 * requestable times, client validation, payload shape, idempotency and error handling
 * live here so the two entry points cannot drift apart.
 */

function timeLabel(value: string): string {
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/**
 * Preferred times a visitor may request, from the shared contract the backend enforces.
 * Philippine time; these are requests for staff to confirm, never availability.
 */
export const TOUR_TIME_OPTIONS = VIEWING_REQUEST_TIMES.map(
  (value) => [value, timeLabel(value)] as const,
);

export const TOUR_FIELD_LABELS: Record<string, string> = {
  name: "Full name",
  email: "Email",
  phone: "Phone number",
  propertyId: "Property ID",
  message: "Notes",
  requestedDate: "Requested date",
  requestedTime: "Requested time",
  privacyConsent: "Privacy consent",
};

const PHONE_PATTERN = /^[+()\d][+()\d\s.-]{5,28}[\d)]$/;

export function tourTimeLabel(value: string): string {
  return /^\d{2}:\d{2}$/.test(value) ? timeLabel(value) : value;
}

/** Formats a YYYY-MM-DD request date without letting the browser timezone shift it. */
export function tourDateLabel(
  value: string,
  style: "short" | "long" = "short",
): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: style === "long" ? "long" : "short",
    month: style === "long" ? "long" : "short",
    day: "numeric",
    ...(style === "long" ? { year: "numeric" as const } : {}),
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export interface TourSubmissionState {
  kind: "idle" | "pending" | "success" | "error";
  message?: string;
  inquiryId?: string;
  issues?: ValidationIssue[];
  /**
   * The backend no longer accepts viewing requests for the property the page supplied
   * (sold, unpublished or removed since it loaded). Surfaces render a dedicated state
   * instead of a Property ID field error the visitor never typed.
   */
  propertyUnavailable?: boolean;
}

export const PROPERTY_UNAVAILABLE_MESSAGE =
  "This property is no longer accepting viewing requests.";

/**
 * True when a rejected viewing request failed only because of its property reference.
 * The backend stays authoritative; this only decides how the rejection is presented.
 */
export function isPropertyUnavailableError(error: unknown): boolean {
  if (!(error instanceof ApiClientError) || error.statusCode !== 400) return false;
  const issues = error.response.issues ?? [];
  return issues.length > 0 && issues.every((issue) => issue.field === "propertyId");
}

export interface TourSchedule {
  propertyId: string;
  requestedDate: string;
  requestedTime: string;
}

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Owns submission state for one viewing request surface. `idPrefix` keeps field ids unique. */
export function useTourRequest(idPrefix: string) {
  const [state, setState] = useState<TourSubmissionState>({ kind: "idle" });
  const idempotencyKeyRef = useRef<string | null>(null);

  const issueFor = useCallback(
    (field: string) => state.issues?.find((issue) => issue.field === field),
    [state.issues],
  );

  const errorId = useCallback(
    (field: string) => `${idPrefix}-${field}-error`,
    [idPrefix],
  );

  const describedBy = useCallback(
    (field: string, supportId?: string) =>
      [supportId, issueFor(field) ? errorId(field) : undefined]
        .filter(Boolean)
        .join(" ") || undefined,
    [errorId, issueFor],
  );

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  const fail = useCallback((message: string, issues?: ValidationIssue[]) => {
    setState({ kind: "error", message, ...(issues ? { issues } : {}) });
  }, []);

  /**
   * Validates and sends the request. Resolves `true` only when the API accepted it.
   * `propertyFromContext` marks a property the page supplied rather than one the visitor
   * typed, so a property rejection becomes the unavailable state, not a field error.
   */
  const submit = useCallback(
    async (
      form: HTMLFormElement,
      schedule: TourSchedule,
      { propertyFromContext = false }: { propertyFromContext?: boolean } = {},
    ): Promise<boolean> => {
      const formData = new FormData(form);
      const name = textValue(formData, "name");
      const phone = textValue(formData, "phone");

      if (name.length < 2) {
        fail("Enter your full name before submitting this request.", [
          { field: "name", message: "Enter at least 2 characters." },
        ]);
        return false;
      }

      if (!PHONE_PATTERN.test(phone)) {
        fail("Enter a valid phone number before submitting this request.", [
          { field: "phone", message: "Enter a valid phone number." },
        ]);
        return false;
      }

      if (formData.get("privacyConsent") !== "on") {
        fail("Please confirm that we may use your details to answer this request.", [
          { field: "privacyConsent", message: "Consent is required to continue." },
        ]);
        return false;
      }

      const message = textValue(formData, "message");
      const payload: CreateInquiryRequest = {
        name,
        email: textValue(formData, "email"),
        phone,
        inquiryType: "viewing",
        source: "viewing-page",
        propertyId: schedule.propertyId.trim(),
        ...(message ? { message } : {}),
        requestedDate: schedule.requestedDate,
        requestedTime: schedule.requestedTime,
        privacyConsent: true,
        website: textValue(formData, "website"),
      };

      setState({ kind: "pending" });
      idempotencyKeyRef.current ??= crypto.randomUUID();

      try {
        const response = await createInquiry(payload, idempotencyKeyRef.current);
        idempotencyKeyRef.current = null;
        setState({
          kind: "success",
          message: response.message,
          inquiryId: response.inquiryId,
        });
        return true;
      } catch (error) {
        if (error instanceof ApiClientError) {
          if (error.statusCode >= 400 && error.statusCode < 500) {
            idempotencyKeyRef.current = null;
          }
          if (propertyFromContext && isPropertyUnavailableError(error)) {
            setState({
              kind: "error",
              message: PROPERTY_UNAVAILABLE_MESSAGE,
              propertyUnavailable: true,
            });
            return false;
          }
          fail(error.message, error.response.issues);
        } else {
          fail("We could not submit your request. Please try again.");
        }
        return false;
      }
    },
    [fail],
  );

  return {
    state,
    issueFor,
    errorId,
    describedBy,
    invalid: (field: string) => Boolean(issueFor(field)),
    reset,
    submit,
  };
}
