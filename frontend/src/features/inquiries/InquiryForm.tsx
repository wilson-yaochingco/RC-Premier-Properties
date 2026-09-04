"use client";

import { useRef, useState, type FormEvent } from "react";
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

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  inquiryType: "Inquiry type",
  propertyId: "Property ID",
  subject: "Subject",
  message: "Message",
  privacyConsent: "Privacy consent",
};

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function InquiryForm({
  defaultInquiryType = "general",
  source,
  propertyId,
  submitLabel = "Send inquiry",
}: InquiryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<SubmissionState>({ kind: "idle" });
  const invalidFields = new Set(state.issues?.map((issue) => issue.field));

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
    const selectedPropertyId = textValue(formData, "propertyId");
    const subject = textValue(formData, "subject");
    const controller = new AbortController();

    const payload: CreateInquiryRequest = {
      name: textValue(formData, "name"),
      email: textValue(formData, "email"),
      inquiryType: textValue(formData, "inquiryType") as InquiryType,
      source,
      message: textValue(formData, "message"),
      privacyConsent: true,
      website: textValue(formData, "website"),
      ...(phone ? { phone } : {}),
      ...(selectedPropertyId ? { propertyId: selectedPropertyId } : {}),
      ...(subject ? { subject } : {}),
    };

    setState({ kind: "pending" });

    try {
      const response = await createInquiry(payload, controller.signal);
      formRef.current?.reset();
      setState({
        kind: "success",
        message: response.message,
        inquiryId: response.inquiryId,
      });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setState({
          kind: "error",
          message: error.message,
          issues: error.response.issues,
        });
      } else {
        setState({
          kind: "error",
          message: "We could not send your inquiry. Please try again.",
        });
      }
    }
  }

  return (
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit}>
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
            aria-describedby={invalidFields.has("name") ? "inquiry-errors" : undefined}
          />
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
            aria-describedby={invalidFields.has("email") ? "inquiry-errors" : undefined}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="inquiry-phone">
            Phone <span className={styles.optional}>(optional)</span>
          </label>
          <input
            id="inquiry-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={30}
            aria-invalid={invalidFields.has("phone")}
            aria-describedby={invalidFields.has("phone") ? "inquiry-errors" : undefined}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="inquiry-type">Inquiry type</label>
          <select
            id="inquiry-type"
            name="inquiryType"
            defaultValue={defaultInquiryType}
            required
            aria-invalid={invalidFields.has("inquiryType")}
            aria-describedby={
              invalidFields.has("inquiryType") ? "inquiry-errors" : undefined
            }
          >
            {INQUIRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="inquiry-property-id">
            Property ID <span className={styles.optional}>(optional)</span>
          </label>
          <input
            id="inquiry-property-id"
            name="propertyId"
            defaultValue={propertyId}
            maxLength={40}
            autoComplete="off"
            aria-invalid={invalidFields.has("propertyId")}
            aria-describedby={
              invalidFields.has("propertyId") ? "inquiry-errors" : undefined
            }
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="inquiry-subject">
            Subject <span className={styles.optional}>(optional)</span>
          </label>
          <input
            id="inquiry-subject"
            name="subject"
            maxLength={150}
            aria-invalid={invalidFields.has("subject")}
            aria-describedby={
              invalidFields.has("subject") ? "inquiry-errors" : undefined
            }
          />
        </div>

        <div className={`${styles.field} ${styles.wide}`}>
          <label htmlFor="inquiry-message">Message</label>
          <textarea
            id="inquiry-message"
            name="message"
            minLength={10}
            maxLength={2000}
            required
            aria-invalid={invalidFields.has("message")}
            aria-describedby={
              invalidFields.has("message") ? "inquiry-errors" : undefined
            }
          />
        </div>
      </div>

      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="inquiry-website">Website</label>
        <input id="inquiry-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <label className={styles.consent}>
        <input
          type="checkbox"
          name="privacyConsent"
          required
          aria-invalid={invalidFields.has("privacyConsent")}
          aria-describedby={
            invalidFields.has("privacyConsent") ? "inquiry-errors" : undefined
          }
        />
        <span>
          I agree that RC Premier Properties may use these details to respond to this
          inquiry. No account is created by submitting this form.
        </span>
      </label>

      {state.kind === "success" && (
        <div className={styles.message} role="status" aria-live="polite">
          <strong>Inquiry received.</strong> {state.message}
          {state.inquiryId && (
            <>
              {" "}
              Reference: <span>{state.inquiryId}</span>.
            </>
          )}
        </div>
      )}

      {state.kind === "error" && (
        <div
          id="inquiry-errors"
          className={`${styles.message} ${styles.error}`}
          role="alert"
          aria-live="assertive"
        >
          <strong>We could not submit the form.</strong> {state.message}
          {state.issues && state.issues.length > 0 && (
            <ul className={styles.issues}>
              {state.issues.map((issue) => (
                <li key={`${issue.field}-${issue.message}`}>
                  {FIELD_LABELS[issue.field] ?? "Form"}: {issue.message}
                </li>
              ))}
            </ul>
          )}
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
