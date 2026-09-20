"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  INQUIRY_TYPES,
  type CreateInquiryRequest,
  type InquirySource,
  type InquiryType,
  type ValidationIssue,
} from "@rc/shared";
import { ApiClientError } from "@/services/api-client";
import { createInquiry } from "./inquiry.service";
import styles from "./InquiryForm.module.css";

interface InquiryFormProps {
  defaultInquiryType?: InquiryType;
  source: InquirySource;
  propertyId?: string;
  submitLabel?: string;
  simplifiedSeller?: boolean;
}

interface SubmissionState {
  kind: "idle" | "pending" | "success" | "error";
  message?: string;
  inquiryId?: string;
  issues?: ValidationIssue[];
}

const TYPE_LABELS: Record<InquiryType, string> = {
  general: "General inquiry",
  property: "Property inquiry",
  viewing: "Viewing request",
  selling: "Sell a property",
};

const PHONE_PATTERN = /^[+()\d][+()\d\s.-]{5,28}[\d)]$/;

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  inquiryType: "Inquiry type",
  propertyId: "Property ID",
  subject: "Subject",
  message: "Message",
  requestedDate: "Requested date",
  requestedTime: "Requested time",
  privacyConsent: "Privacy consent",
};

const FIELD_IDS: Record<string, string> = {
  name: "inquiry-name",
  email: "inquiry-email",
  phone: "inquiry-phone",
  inquiryType: "inquiry-type",
  propertyId: "inquiry-property-id",
  subject: "inquiry-subject",
  message: "inquiry-message",
  requestedDate: "viewing-requested-date",
  requestedTime: "viewing-requested-time",
  privacyConsent: "inquiry-privacy-consent",
};

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function FieldError({ field, issue }: { field: string; issue?: ValidationIssue }) {
  return issue ? (
    <p id={`inquiry-${field}-error`} className={styles.fieldError}>
      {issue.message}
    </p>
  ) : null;
}

export function InquiryForm({
  defaultInquiryType = "general",
  source,
  propertyId,
  submitLabel = "Send inquiry",
  simplifiedSeller = false,
}: InquiryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const [state, setState] = useState<SubmissionState>({ kind: "idle" });
  const [messageLength, setMessageLength] = useState(0);
  const invalidFields = new Set(state.issues?.map((issue) => issue.field));
  const isViewingRequest =
    defaultInquiryType === "viewing" && source === "viewing-page";

  useEffect(() => {
    if (state.kind === "error") errorRef.current?.focus();
  }, [state.kind, state.issues]);

  function issueFor(field: string): ValidationIssue | undefined {
    return state.issues?.find((issue) => issue.field === field);
  }

  function describedBy(field: string, ...supportIds: Array<string | undefined>) {
    const ids = supportIds.filter(Boolean) as string[];
    if (issueFor(field)) ids.push(`inquiry-${field}-error`);
    return ids.length > 0 ? ids.join(" ") : undefined;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (formData.get("privacyConsent") !== "on") {
      setState({
        kind: "error",
        message: "Please confirm that we may use your details to answer this inquiry.",
        issues: [
          { field: "privacyConsent", message: "Consent is required to continue." },
        ],
      });
      return;
    }

    const phone = textValue(formData, "phone");
    if (!PHONE_PATTERN.test(phone)) {
      setState({
        kind: "error",
        message: "Enter a valid phone number before submitting this inquiry.",
        issues: [{ field: "phone", message: "Enter a valid phone number." }],
      });
      return;
    }
    const selectedPropertyId = textValue(formData, "propertyId");
    const subject = textValue(formData, "subject");
    const controller = new AbortController();

    const payload: CreateInquiryRequest = {
      name: textValue(formData, "name"),
      email: textValue(formData, "email"),
      inquiryType: simplifiedSeller
        ? "selling"
        : (textValue(formData, "inquiryType") as InquiryType),
      source,
      privacyConsent: true,
      website: textValue(formData, "website"),
      ...(phone ? { phone } : {}),
      ...(selectedPropertyId ? { propertyId: selectedPropertyId } : {}),
      ...(subject ? { subject } : {}),
      ...(textValue(formData, "message")
        ? { message: textValue(formData, "message") }
        : {}),
      ...(isViewingRequest
        ? {
            requestedDate: textValue(formData, "requestedDate"),
            requestedTime: textValue(formData, "requestedTime"),
          }
        : {}),
    };

    setState({ kind: "pending" });
    idempotencyKeyRef.current ??= crypto.randomUUID();

    try {
      const response = await createInquiry(
        payload,
        idempotencyKeyRef.current,
        controller.signal,
      );
      idempotencyKeyRef.current = null;
      formRef.current?.reset();
      setMessageLength(0);
      setState({
        kind: "success",
        message: isViewingRequest
          ? response.message
          : "Thank you. RC Premier Properties will get back to you soon.",
        inquiryId: response.inquiryId,
      });
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.statusCode >= 400 && error.statusCode < 500) {
          idempotencyKeyRef.current = null;
        }
        setState({
          kind: "error",
          message:
            error.statusCode === 429
              ? "Please wait a few minutes before trying again."
              : error.statusCode === 0
                ? "Please check your connection and try again."
                : error.response.issues?.length && error.statusCode < 500
                  ? "Please correct the highlighted details and try again."
                  : "Please try again. If the problem continues, contact us directly.",
          issues: error.statusCode < 500 ? error.response.issues : undefined,
        });
      } else {
        setState({
          kind: "error",
          message: "Please try again. If the problem continues, contact us directly.",
        });
      }
    }
  }

  return (
    <form
      ref={formRef}
      className={styles.form}
      onSubmit={handleSubmit}
      aria-busy={state.kind === "pending"}
    >
      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="inquiry-name">Name</label>
          <input
            id="inquiry-name"
            name="name"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
            aria-invalid={invalidFields.has("name")}
            aria-describedby={describedBy("name")}
          />
          <FieldError field="name" issue={issueFor("name")} />
        </div>

        <div className={styles.field}>
          <label htmlFor="inquiry-email">Email</label>
          <input
            id="inquiry-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            required
            aria-invalid={invalidFields.has("email")}
            aria-describedby={describedBy("email")}
          />
          <FieldError field="email" issue={issueFor("email")} />
        </div>

        <div className={styles.field}>
          <label htmlFor="inquiry-phone">Phone</label>
          <input
            id="inquiry-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={30}
            required
            aria-invalid={invalidFields.has("phone")}
            aria-describedby={describedBy("phone")}
          />
          <FieldError field="phone" issue={issueFor("phone")} />
        </div>

        {isViewingRequest || simplifiedSeller ? (
          <input
            type="hidden"
            name="inquiryType"
            value={simplifiedSeller ? "selling" : "viewing"}
          />
        ) : (
          <div className={styles.field}>
            <label htmlFor="inquiry-type">Inquiry type</label>
            <select
              id="inquiry-type"
              name="inquiryType"
              defaultValue={defaultInquiryType}
              required
              aria-invalid={invalidFields.has("inquiryType")}
              aria-describedby={describedBy("inquiryType")}
            >
              {INQUIRY_TYPES.filter((type) => type !== "viewing").map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <FieldError field="inquiryType" issue={issueFor("inquiryType")} />
          </div>
        )}

        {!simplifiedSeller ? (
          <div className={styles.field}>
            <label htmlFor="inquiry-property-id">
              Property ID{" "}
              {!isViewingRequest ? (
                <span className={styles.optional}>(optional)</span>
              ) : null}
            </label>
            <input
              id="inquiry-property-id"
              name="propertyId"
              defaultValue={propertyId}
              maxLength={40}
              autoComplete="off"
              required={isViewingRequest}
              aria-invalid={invalidFields.has("propertyId")}
              aria-describedby={describedBy("propertyId")}
            />
            <FieldError field="propertyId" issue={issueFor("propertyId")} />
          </div>
        ) : null}

        {isViewingRequest ? (
          <>
            <div className={styles.field}>
              <label htmlFor="viewing-requested-date">Requested date</label>
              <input
                id="viewing-requested-date"
                name="requestedDate"
                type="date"
                required
                aria-invalid={invalidFields.has("requestedDate")}
                aria-describedby={describedBy("requestedDate", "viewing-time-note")}
              />
              <FieldError field="requestedDate" issue={issueFor("requestedDate")} />
            </div>
            <div className={styles.field}>
              <label htmlFor="viewing-requested-time">Requested time</label>
              <input
                id="viewing-requested-time"
                name="requestedTime"
                type="time"
                required
                aria-invalid={invalidFields.has("requestedTime")}
                aria-describedby={describedBy("requestedTime", "viewing-time-note")}
              />
              <p id="viewing-time-note" className={styles.optional}>
                Philippine time. Staff confirmation is required.
              </p>
              <FieldError field="requestedTime" issue={issueFor("requestedTime")} />
            </div>
          </>
        ) : null}

        <div className={styles.field}>
          <label htmlFor="inquiry-subject">
            {simplifiedSeller ? "Property location or area" : "Subject"}{" "}
            <span className={styles.optional}>(optional)</span>
          </label>
          <input
            id="inquiry-subject"
            name="subject"
            maxLength={150}
            aria-invalid={invalidFields.has("subject")}
            aria-describedby={describedBy("subject")}
          />
          <FieldError field="subject" issue={issueFor("subject")} />
        </div>

        <div className={`${styles.field} ${styles.wide}`}>
          <label htmlFor="inquiry-message">
            {simplifiedSeller ? "Property details and message" : "Message"}{" "}
            {isViewingRequest ? (
              <span className={styles.optional}>(optional)</span>
            ) : null}
          </label>
          <textarea
            id="inquiry-message"
            name="message"
            minLength={10}
            maxLength={2000}
            required={!isViewingRequest}
            onChange={(event) => setMessageLength(event.target.value.length)}
            aria-invalid={invalidFields.has("message")}
            aria-describedby={describedBy("message", "inquiry-message-count")}
          />
          <span id="inquiry-message-count" className={styles.counter}>
            {messageLength} of 2000 characters
          </span>
          <FieldError field="message" issue={issueFor("message")} />
        </div>
      </div>

      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="inquiry-website">Website</label>
        <input id="inquiry-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <label className={styles.consent}>
        <input
          id="inquiry-privacy-consent"
          type="checkbox"
          name="privacyConsent"
          required
          aria-invalid={invalidFields.has("privacyConsent")}
          aria-describedby={describedBy("privacyConsent")}
        />
        <span>
          I agree that RC Premier Properties may use these details to respond to this
          inquiry. No account is created by submitting this form.
        </span>
      </label>
      <FieldError field="privacyConsent" issue={issueFor("privacyConsent")} />

      {state.kind === "success" && (
        <div
          className={`${styles.message} ${styles.success}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <svg
            className={styles.indicator}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 3 3 5-6" />
          </svg>
          <div className={styles.messageContent}>
            <strong className={styles.messageTitle}>
              {isViewingRequest
                ? "Viewing request received."
                : "Inquiry submitted successfully."}
            </strong>
            <p>{state.message}</p>
            {state.inquiryId && (
              <p className={styles.reference}>
                Reference: <span>{state.inquiryId}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {state.kind === "error" && (
        <div
          ref={errorRef}
          id="inquiry-errors"
          className={`${styles.message} ${styles.error}`}
          role="alert"
          tabIndex={-1}
        >
          <svg
            className={styles.indicator}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v6m0 3v1" />
          </svg>
          <div className={styles.messageContent}>
            <strong className={styles.messageTitle}>
              {state.issues?.length
                ? "Please check your inquiry details."
                : "We couldn't submit your inquiry."}
            </strong>
            <p>{state.message}</p>
            {state.issues && state.issues.length > 0 && (
              <ul className={styles.issues}>
                {state.issues.map((issue) => (
                  <li key={`${issue.field}-${issue.message}`}>
                    {FIELD_IDS[issue.field] ? (
                      <a href={`#${FIELD_IDS[issue.field]}`}>
                        {FIELD_LABELS[issue.field] ?? "Form"}: {issue.message}
                      </a>
                    ) : (
                      <>
                        {FIELD_LABELS[issue.field] ?? "Form"}: {issue.message}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <button
        className={styles.submit}
        type="submit"
        disabled={state.kind === "pending"}
      >
        {state.kind === "pending" ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
