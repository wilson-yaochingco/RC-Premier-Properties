"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { CreateInquiryRequest, ValidationIssue } from "@rc/shared";
import viewingImage from "@/assets/site/book-viewing.png";
import { PropertyMedia } from "@/features/properties/PropertyMedia";
import { addInputCalendarDays, businessDateInputValue } from "@/lib/date-time";
import { ApiClientError } from "@/services/api-client";
import { createInquiry } from "./inquiry.service";
import type { TourPropertyContext } from "./RequestTourProvider";
import styles from "./RequestTourModal.module.css";

interface SubmissionState {
  kind: "idle" | "pending" | "success" | "error";
  message?: string;
  inquiryId?: string;
  issues?: ValidationIssue[];
}

const FIELD_LABELS: Record<string, string> = {
  name: "Full name",
  email: "Email",
  phone: "Phone number",
  propertyId: "Property ID",
  message: "Notes",
  requestedDate: "Requested date",
  requestedTime: "Requested time",
  privacyConsent: "Privacy consent",
};

const TIME_OPTIONS = [
  ["09:00", "9:00 AM"],
  ["09:30", "9:30 AM"],
  ["10:00", "10:00 AM"],
  ["10:30", "10:30 AM"],
  ["11:00", "11:00 AM"],
  ["11:30", "11:30 AM"],
  ["13:00", "1:00 PM"],
  ["13:30", "1:30 PM"],
  ["14:00", "2:00 PM"],
  ["14:30", "2:30 PM"],
  ["15:00", "3:00 PM"],
  ["15:30", "3:30 PM"],
  ["16:00", "4:00 PM"],
] as const;

const PHONE_PATTERN = /^[+()\d][+()\d\s.-]{5,28}[\d)]$/;

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function FieldError({ issue, id }: { issue?: ValidationIssue; id: string }) {
  return issue ? (
    <p id={id} className={styles.fieldError}>
      {issue.message}
    </p>
  ) : null;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function RequestTourModal({
  property,
  onDismiss,
}: {
  property?: TourPropertyContext;
  onDismiss: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const propertyInputRef = useRef<HTMLInputElement>(null);
  const firstDateRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const today = useMemo(() => businessDateInputValue(), []);
  const [datePageStart, setDatePageStart] = useState(1);
  const dateOptions = useMemo(
    () => [0, 1, 2].map((days) => addInputCalendarDays(today, datePageStart + days)),
    [datePageStart, today],
  );
  const [step, setStep] = useState<"schedule" | "details" | "success">("schedule");
  const [selectedDate, setSelectedDate] = useState(dateOptions[0] ?? "");
  const [selectedTime, setSelectedTime] = useState("11:30");
  const [propertyId, setPropertyId] = useState(property?.propertyId ?? "");
  const [messageLength, setMessageLength] = useState(0);
  const [state, setState] = useState<SubmissionState>({ kind: "idle" });
  const invalidFields = new Set(state.issues?.map((issue) => issue.field));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() =>
      (property?.propertyId ? firstDateRef.current : propertyInputRef.current)?.focus(),
    );
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [property?.propertyId]);

  useEffect(() => {
    if (state.kind === "error") errorRef.current?.focus();
  }, [state.kind, state.issues]);

  function issueFor(field: string) {
    return state.issues?.find((issue) => issue.field === field);
  }

  function describedBy(field: string, supportId?: string) {
    return (
      [supportId, issueFor(field) ? `tour-${field}-error` : undefined]
        .filter(Boolean)
        .join(" ") || undefined
    );
  }

  function close() {
    dialogRef.current?.close();
  }

  function continueToDetails() {
    const propertyControl = propertyInputRef.current;
    if (propertyControl && !propertyControl.reportValidity()) return;
    if (!selectedDate || !selectedTime) return;
    setState({ kind: "idle" });
    setStep("details");
  }

  function showDatePage(nextStart: number) {
    const boundedStart = Math.max(1, nextStart);
    setDatePageStart(boundedStart);
    setSelectedDate(addInputCalendarDays(today, boundedStart));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = textValue(formData, "name");
    const phone = textValue(formData, "phone");

    if (name.length < 2) {
      setState({
        kind: "error",
        message: "Enter your full name before submitting this request.",
        issues: [{ field: "name", message: "Enter at least 2 characters." }],
      });
      return;
    }

    if (!PHONE_PATTERN.test(phone)) {
      setState({
        kind: "error",
        message: "Enter a valid phone number before submitting this request.",
        issues: [{ field: "phone", message: "Enter a valid phone number." }],
      });
      return;
    }

    if (formData.get("privacyConsent") !== "on") {
      setState({
        kind: "error",
        message: "Please confirm that we may use your details to answer this request.",
        issues: [
          { field: "privacyConsent", message: "Consent is required to continue." },
        ],
      });
      return;
    }

    const message = textValue(formData, "message");
    const payload: CreateInquiryRequest = {
      name,
      email: textValue(formData, "email"),
      phone,
      inquiryType: "viewing",
      source: "viewing-page",
      propertyId,
      ...(message ? { message } : {}),
      requestedDate: selectedDate,
      requestedTime: selectedTime,
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
      setStep("success");
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.statusCode >= 400 && error.statusCode < 500) {
          idempotencyKeyRef.current = null;
        }
        setState({
          kind: "error",
          message: error.message,
          issues: error.response.issues,
        });
      } else {
        setState({
          kind: "error",
          message: "We could not submit your request. Please try again.",
        });
      }
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="request-tour-title"
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={onDismiss}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const focusable = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ].filter((element) => element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className={styles.shell}>
        <div className={styles.header}>
          <h2 id="request-tour-title">Request a Tour</h2>
          <button type="button" onClick={close} aria-label="Close Request a Tour">
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {step === "schedule" ? (
          <div className={styles.scheduleStep}>
            <div className={styles.propertySummary}>
              <figure className={styles.propertyMedia}>
                {property?.media ? (
                  <PropertyMedia
                    media={property.media}
                    label="PROPERTY IMAGE"
                    sizes="200px"
                  />
                ) : (
                  <Image
                    src={viewingImage}
                    alt="Landscaped garden beside an RC Premier residence"
                    fill
                    sizes="200px"
                  />
                )}
              </figure>
              <div>
                {property?.title ? (
                  <p className={styles.propertyTitle}>{property.title}</p>
                ) : null}
                {property?.propertyId ? (
                  <p className={styles.propertyNumber}>
                    Premier Property #{property.propertyId}
                  </p>
                ) : (
                  <label className={styles.propertyField} htmlFor="tour-property-id">
                    <span>Property ID</span>
                    <input
                      ref={propertyInputRef}
                      id="tour-property-id"
                      name="propertyId"
                      value={propertyId}
                      onChange={(event) => setPropertyId(event.target.value)}
                      maxLength={40}
                      autoComplete="off"
                      placeholder="e.g. RCPP-001"
                      required
                    />
                  </label>
                )}
              </div>
            </div>

            <fieldset className={styles.scheduleFields}>
              <legend>Choose a preferred date and time</legend>
              <div className={styles.datePicker}>
                <button
                  type="button"
                  className={styles.dateNavigation}
                  aria-label="Earlier dates"
                  disabled={datePageStart === 1}
                  onClick={() => showDatePage(datePageStart - 3)}
                >
                  <span aria-hidden="true">‹</span>
                </button>
                <div className={styles.dateCards}>
                  {dateOptions.map((date, index) => {
                    const [weekday, calendarDate] = dateLabel(date).split(", ");
                    return (
                      <label key={date} className={styles.dateCard}>
                        <input
                          ref={index === 0 ? firstDateRef : undefined}
                          type="radio"
                          name="requestedDate"
                          value={date}
                          checked={selectedDate === date}
                          onChange={() => setSelectedDate(date)}
                          required
                        />
                        <span>
                          <strong>{weekday}</strong>
                          <small>{calendarDate}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className={styles.dateNavigation}
                  aria-label="Later dates"
                  onClick={() => showDatePage(datePageStart + 3)}
                >
                  <span aria-hidden="true">›</span>
                </button>
              </div>
              <label className={styles.timeField} htmlFor="tour-requested-time">
                <span>Preferred time</span>
                <select
                  id="tour-requested-time"
                  name="requestedTime"
                  value={selectedTime}
                  onChange={(event) => setSelectedTime(event.target.value)}
                  required
                  aria-describedby="tour-time-note"
                >
                  {TIME_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <p id="tour-time-note" className={styles.scheduleNote}>
                Philippine time. This is a request; staff confirmation is required.
              </p>
            </fieldset>

            <button
              type="button"
              className={styles.primaryAction}
              onClick={continueToDetails}
            >
              Next
            </button>
          </div>
        ) : null}

        {step === "details" ? (
          <form
            className={styles.detailsStep}
            onSubmit={handleSubmit}
            aria-busy={state.kind === "pending"}
          >
            <div className={styles.detailsIntro}>
              <p className={styles.stepLabel}>Your details</p>
              <h3 id="tour-details-heading">Where should we follow up?</h3>
              <p>
                {dateLabel(selectedDate)} at{" "}
                {TIME_OPTIONS.find(([value]) => value === selectedTime)?.[1] ??
                  selectedTime}
              </p>
            </div>

            <div className={styles.fieldGrid}>
              <label className={styles.field} htmlFor="tour-name">
                <span>Full name</span>
                <input
                  id="tour-name"
                  name="name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={100}
                  required
                  aria-invalid={invalidFields.has("name")}
                  aria-describedby={describedBy("name")}
                />
                <FieldError issue={issueFor("name")} id="tour-name-error" />
              </label>

              <label className={styles.field} htmlFor="tour-phone">
                <span>Phone number</span>
                <input
                  id="tour-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={30}
                  required
                  aria-invalid={invalidFields.has("phone")}
                  aria-describedby={describedBy("phone")}
                />
                <FieldError issue={issueFor("phone")} id="tour-phone-error" />
              </label>

              <label className={styles.field} htmlFor="tour-email">
                <span>Email</span>
                <input
                  id="tour-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  aria-invalid={invalidFields.has("email")}
                  aria-describedby={describedBy("email")}
                />
                <FieldError issue={issueFor("email")} id="tour-email-error" />
              </label>

              <label
                className={`${styles.field} ${styles.wide}`}
                htmlFor="tour-message"
              >
                <span>
                  Notes for the team <small>(optional)</small>
                </span>
                <textarea
                  id="tour-message"
                  name="message"
                  minLength={10}
                  maxLength={2000}
                  onChange={(event) => setMessageLength(event.target.value.length)}
                  aria-invalid={invalidFields.has("message")}
                  aria-describedby={describedBy("message", "tour-message-count")}
                />
                <small id="tour-message-count" className={styles.counter}>
                  {messageLength} of 2000 characters
                </small>
                <FieldError issue={issueFor("message")} id="tour-message-error" />
              </label>
            </div>

            <div className={styles.honeypot} aria-hidden="true">
              <label htmlFor="tour-website">Website</label>
              <input
                id="tour-website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <label className={styles.consent} htmlFor="tour-privacy-consent">
              <input
                id="tour-privacy-consent"
                type="checkbox"
                name="privacyConsent"
                required
                aria-invalid={invalidFields.has("privacyConsent")}
                aria-describedby={describedBy("privacyConsent")}
              />
              <span>
                I agree that RC Premier Properties may use these details to respond to
                this viewing request. No account is created.
              </span>
            </label>
            <FieldError
              issue={issueFor("privacyConsent")}
              id="tour-privacyConsent-error"
            />

            {state.kind === "error" ? (
              <div
                ref={errorRef}
                id="tour-errors"
                className={styles.errorMessage}
                role="alert"
                tabIndex={-1}
              >
                <strong>We could not submit the request.</strong> {state.message}
                {state.issues?.length ? (
                  <ul>
                    {state.issues.map((issue) => (
                      <li key={`${issue.field}-${issue.message}`}>
                        {FIELD_LABELS[issue.field] ?? "Form"}: {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.backAction}
                onClick={() => {
                  setState({ kind: "idle" });
                  setStep("schedule");
                }}
              >
                Back
              </button>
              <button
                type="submit"
                className={styles.primaryAction}
                disabled={state.kind === "pending"}
              >
                {state.kind === "pending" ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </form>
        ) : null}

        {step === "success" ? (
          <div className={styles.successStep} role="status" aria-live="polite">
            <p className={styles.stepLabel}>Request submitted</p>
            <h3>Thank you. The team will follow up.</h3>
            <p>
              {state.message} Your requested time is not confirmed until RC Premier
              Properties contacts you.
            </p>
            {state.inquiryId ? (
              <p className={styles.reference}>Reference: {state.inquiryId}</p>
            ) : null}
            <button type="button" className={styles.primaryAction} onClick={close}>
              Done
            </button>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
