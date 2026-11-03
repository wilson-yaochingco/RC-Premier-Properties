"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import type {
  PropertyAvailability,
  PublicPropertyMedia,
  ValidationIssue,
} from "@rc/shared";
import viewingImage from "@/assets/site/book-viewing.png";
import { RollLabel } from "@/components/ui/RollLabel";
import { PropertyMedia } from "@/features/properties/PropertyMedia";
import {
  addInputCalendarDays,
  businessDateInputValue,
  inputMonthDays,
  shiftInputMonth,
} from "@/lib/date-time";
import {
  TOUR_FIELD_LABELS,
  TOUR_TIME_OPTIONS,
  tourDateLabel,
  tourTimeLabel,
  useTourRequest,
} from "./tour-request";
import styles from "./viewing-scheduler.module.css";

export interface ViewingProperty {
  propertyId: string;
  title: string;
  slug: string;
  availability: PropertyAvailability;
  typeLabel: string;
  locationLabel: string;
  media?: PublicPropertyMedia;
}

/** What the server could truthfully resolve from `?propertyId=`. */
export type ViewingPropertyState =
  | { status: "none" }
  | { status: "resolved"; property: ViewingProperty }
  | { status: "not-found"; propertyId: string }
  | { status: "unavailable"; propertyId: string };

type Step = "schedule" | "details" | "success";

const STEPS: Array<{ id: Step; label: string }> = [
  { id: "schedule", label: "Schedule" },
  { id: "details", label: "Details" },
  { id: "success", label: "Requested" },
];

/** A UI horizon for requests; the backend only requires a future Philippine time. */
const REQUEST_HORIZON_DAYS = 90;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const TIME_GROUPS = [
  {
    id: "morning",
    label: "Morning",
    options: TOUR_TIME_OPTIONS.filter(([value]) => value < "12:00"),
  },
  {
    id: "afternoon",
    label: "Afternoon",
    options: TOUR_TIME_OPTIONS.filter(([value]) => value >= "12:00"),
  },
] as const;

const AVAILABILITY_LABEL: Record<PropertyAvailability, string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
};

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
}

function Arrow({ direction = "right" }: { direction?: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className={direction === "left" ? styles.arrowLeft : undefined}
    >
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function FieldError({ issue, id }: { issue?: ValidationIssue; id: string }) {
  return issue ? (
    <p id={id} className={styles.fieldError}>
      {issue.message}
    </p>
  ) : null;
}

function Progress({ step }: { step: Step }) {
  const current = STEPS.findIndex((candidate) => candidate.id === step);
  return (
    <ol className={styles.progress} aria-label="Viewing request progress">
      {STEPS.map((candidate, index) => (
        <li
          key={candidate.id}
          data-state={
            index < current ? "complete" : index === current ? "current" : "upcoming"
          }
          aria-current={index === current ? "step" : undefined}
        >
          <span className={styles.progressNumber}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span>{candidate.label}</span>
        </li>
      ))}
    </ol>
  );
}

function PropertyPanel({
  context,
  propertyId,
  onPropertyIdChange,
  locked,
  inputRef,
}: {
  context: ViewingPropertyState;
  propertyId: string;
  onPropertyIdChange: (value: string) => void;
  locked: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  if (context.status === "resolved") {
    const { property } = context;
    return (
      <aside className={styles.context} aria-labelledby="viewing-property-title">
        <figure className={styles.contextMedia}>
          <PropertyMedia
            media={property.media}
            label="PROPERTY IMAGE"
            sizes="(max-width: 959px) 40vw, 32rem"
            preload
          />
        </figure>
        <div className={styles.contextCopy}>
          <p className={styles.contextEyebrow}>Viewing request for</p>
          <p id="viewing-property-title" className={styles.contextTitle}>
            {property.title}
          </p>
          <dl className={styles.contextFacts}>
            <div>
              <dt>Premier Property</dt>
              <dd>#{property.propertyId}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{property.locationLabel}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{property.typeLabel}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{AVAILABILITY_LABEL[property.availability]}</dd>
            </div>
          </dl>
          <Link href={`/properties/${property.slug}`} className={styles.textLink}>
            <span>View property details</span>
            <Arrow />
          </Link>
        </div>
      </aside>
    );
  }

  const message =
    context.status === "not-found"
      ? `We could not find a published property with the ID “${context.propertyId}”. Check the number on the listing, or browse current properties.`
      : context.status === "unavailable"
        ? "Property details could not be loaded right now. You can still send this request; the team checks the Property ID before following up."
        : "Enter the Premier Property number shown on the listing you would like to see.";

  return (
    <aside className={styles.context} aria-labelledby="viewing-property-heading">
      <figure className={styles.contextMedia}>
        <Image
          src={viewingImage}
          alt=""
          fill
          sizes="(max-width: 959px) 40vw, 32rem"
          priority
        />
      </figure>
      <div className={styles.contextCopy}>
        <p className={styles.contextEyebrow}>Which property?</p>
        <p id="viewing-property-heading" className={styles.contextTitle}>
          {context.status === "none" ? "Choose the property" : "Confirm the property"}
        </p>
        <p className={styles.contextNote} id="viewing-property-note">
          {message}
        </p>
        <label className={styles.propertyField} htmlFor="viewing-property-id">
          <span>Property ID</span>
          <input
            ref={inputRef}
            id="viewing-property-id"
            name="propertyId"
            value={propertyId}
            onChange={(event) => onPropertyIdChange(event.target.value)}
            maxLength={40}
            pattern="[A-Za-z0-9][A-Za-z0-9_\-]*"
            autoComplete="off"
            placeholder="e.g. RCPP-001"
            aria-describedby="viewing-property-note"
            readOnly={locked}
            required
          />
        </label>
        <Link href="/properties" className={styles.textLink}>
          <span>Browse properties</span>
          <Arrow />
        </Link>
      </div>
    </aside>
  );
}

export function ViewingScheduler({ context }: { context: ViewingPropertyState }) {
  const [today] = useState(() => businessDateInputValue());
  const firstDate = addInputCalendarDays(today, 1);
  const lastDate = addInputCalendarDays(today, REQUEST_HORIZON_DAYS);
  const firstMonth = firstDate.slice(0, 7);
  const lastMonth = lastDate.slice(0, 7);

  const [step, setStep] = useState<Step>("schedule");
  const [month, setMonth] = useState(firstMonth);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [scheduleError, setScheduleError] = useState<string>();
  const [messageLength, setMessageLength] = useState(0);
  const [propertyId, setPropertyId] = useState(
    context.status === "resolved"
      ? context.property.propertyId
      : context.status === "none"
        ? ""
        : context.propertyId,
  );

  const { state, issueFor, errorId, describedBy, invalid, reset, submit } =
    useTourRequest("viewing");
  const propertyInputRef = useRef<HTMLInputElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const scheduleErrorRef = useRef<HTMLParagraphElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const movedRef = useRef(false);

  const property = context.status === "resolved" ? context.property : undefined;
  const sold = property?.availability === "sold";
  const { leading, days } = inputMonthDays(month);

  useEffect(() => {
    if (!movedRef.current) return;
    stepHeadingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (state.kind === "error") errorRef.current?.focus();
  }, [state.kind, state.issues]);

  useEffect(() => {
    if (scheduleError) scheduleErrorRef.current?.focus();
  }, [scheduleError]);

  function goTo(next: Step) {
    movedRef.current = true;
    setStep(next);
  }

  function continueToDetails() {
    const control = propertyInputRef.current;
    if (control && !control.reportValidity()) return;
    if (!selectedDate || !selectedTime) {
      setScheduleError(
        !selectedDate && !selectedTime
          ? "Choose a preferred date and time to continue."
          : !selectedDate
            ? "Choose a preferred date to continue."
            : "Choose a preferred time to continue.",
      );
      return;
    }
    setScheduleError(undefined);
    reset();
    goTo("details");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accepted = await submit(event.currentTarget, {
      propertyId,
      requestedDate: selectedDate,
      requestedTime: selectedTime,
    });
    if (accepted) goTo("success");
  }

  return (
    <div className={styles.shell}>
      <PropertyPanel
        context={context}
        propertyId={propertyId}
        onPropertyIdChange={setPropertyId}
        locked={step !== "schedule"}
        inputRef={propertyInputRef}
      />

      <section className={styles.scheduler} aria-labelledby="viewing-step-heading">
        {sold ? (
          <div className={styles.closed}>
            <p className={styles.stepEyebrow}>Viewing requests closed</p>
            <h2 id="viewing-step-heading" className={styles.stepHeading}>
              This property has been sold.
            </h2>
            <p>
              Viewing requests are no longer accepted for {property?.title}. Current
              listings remain open for a viewing request.
            </p>
            <Link href="/properties" className={`${styles.primaryAction} cta`}>
              <RollLabel>Browse properties</RollLabel>
              <Arrow />
            </Link>
          </div>
        ) : (
          <>
            <Progress step={step} />

            {step === "schedule" ? (
              <div className={styles.step}>
                <h2
                  id="viewing-step-heading"
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className={styles.stepHeading}
                >
                  Choose a preferred date and time.
                </h2>

                <div className={styles.scheduleGrid}>
                  <fieldset className={styles.dateFieldset}>
                    <legend className={styles.fieldsetLabel}>Preferred date</legend>
                    <div className={styles.monthBar}>
                      <button
                        type="button"
                        className={styles.monthButton}
                        aria-label="Previous month"
                        disabled={month <= firstMonth}
                        onClick={() => setMonth(shiftInputMonth(month, -1))}
                      >
                        <Arrow direction="left" />
                      </button>
                      <p className={styles.monthName} aria-live="polite">
                        {monthLabel(month)}
                      </p>
                      <button
                        type="button"
                        className={styles.monthButton}
                        aria-label="Next month"
                        disabled={month >= lastMonth}
                        onClick={() => setMonth(shiftInputMonth(month, 1))}
                      >
                        <Arrow />
                      </button>
                    </div>
                    <div className={styles.weekdays} aria-hidden="true">
                      {WEEKDAYS.map((weekday) => (
                        <span key={weekday}>{weekday.slice(0, 1)}</span>
                      ))}
                    </div>
                    <div className={styles.days}>
                      {Array.from({ length: leading }, (_, index) => (
                        <span key={`blank-${index}`} aria-hidden="true" />
                      ))}
                      {days.map((date) => {
                        const day = Number(date.slice(8));
                        const requestable = date >= firstDate && date <= lastDate;
                        if (!requestable) {
                          return (
                            <span
                              key={date}
                              className={styles.day}
                              data-disabled="true"
                              data-today={date === today || undefined}
                              aria-hidden="true"
                            >
                              {day}
                            </span>
                          );
                        }
                        return (
                          <label key={date} className={styles.day}>
                            <input
                              type="radio"
                              name="requestedDate"
                              value={date}
                              checked={selectedDate === date}
                              onChange={() => {
                                setSelectedDate(date);
                                setScheduleError(undefined);
                              }}
                            />
                            <span aria-hidden="true">{day}</span>
                            <span className={styles.srOnly}>
                              {tourDateLabel(date, "long")}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <p className={styles.scheduleNote}>
                      Your selection is a request. RC Premier will confirm the schedule.
                    </p>
                  </fieldset>

                  <fieldset className={styles.timeFieldset}>
                    <legend className={styles.fieldsetLabel}>Preferred time</legend>
                    <p className={styles.timeZone}>Philippine time</p>
                    {TIME_GROUPS.map((group) => (
                      <div
                        key={group.id}
                        className={styles.timeGroup}
                        role="group"
                        aria-labelledby={`viewing-time-${group.id}`}
                      >
                        <p
                          id={`viewing-time-${group.id}`}
                          className={styles.timeGroupLabel}
                        >
                          {group.label}
                        </p>
                        <div className={styles.timeSlots}>
                          {group.options.map(([value, label]) => (
                            <label key={value} className={styles.timeSlot}>
                              <input
                                type="radio"
                                name="requestedTime"
                                value={value}
                                checked={selectedTime === value}
                                onChange={() => {
                                  setSelectedTime(value);
                                  setScheduleError(undefined);
                                }}
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    <p className={styles.scheduleNote}>
                      Requested times require staff confirmation.
                    </p>
                  </fieldset>
                </div>

                {scheduleError ? (
                  <p
                    ref={scheduleErrorRef}
                    className={styles.inlineError}
                    role="alert"
                    tabIndex={-1}
                  >
                    {scheduleError}
                  </p>
                ) : null}

                <div className={styles.stepActions}>
                  <p className={styles.selection} aria-live="polite">
                    {selectedDate
                      ? tourDateLabel(selectedDate, "long")
                      : "No date chosen"}
                    <span aria-hidden="true"> · </span>
                    {selectedTime ? tourTimeLabel(selectedTime) : "No time chosen"}
                  </p>
                  <button
                    type="button"
                    className={`${styles.primaryAction} cta`}
                    onClick={continueToDetails}
                  >
                    <RollLabel>Continue to your details</RollLabel>
                    <Arrow />
                  </button>
                </div>
              </div>
            ) : null}

            {step === "details" ? (
              <form
                className={styles.step}
                onSubmit={handleSubmit}
                aria-busy={state.kind === "pending"}
              >
                <h2
                  id="viewing-step-heading"
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className={styles.stepHeading}
                >
                  Where should we follow up?
                </h2>

                <div className={styles.summary}>
                  <div>
                    <p className={styles.summaryLabel}>Your request</p>
                    <p className={styles.summaryDate}>
                      {tourDateLabel(selectedDate, "long")}
                    </p>
                    <p className={styles.summaryTime}>
                      {tourTimeLabel(selectedTime)} · Philippine time
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.editAction}
                    onClick={() => {
                      reset();
                      goTo("schedule");
                    }}
                  >
                    Edit schedule
                  </button>
                </div>

                <div className={styles.fieldGrid}>
                  <label className={styles.field} htmlFor="viewing-name">
                    <span>Full name</span>
                    <input
                      id="viewing-name"
                      name="name"
                      autoComplete="name"
                      minLength={2}
                      maxLength={100}
                      required
                      aria-invalid={invalid("name")}
                      aria-describedby={describedBy("name")}
                    />
                    <FieldError issue={issueFor("name")} id={errorId("name")} />
                  </label>

                  <label className={styles.field} htmlFor="viewing-phone">
                    <span>Phone number</span>
                    <input
                      id="viewing-phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={30}
                      required
                      aria-invalid={invalid("phone")}
                      aria-describedby={describedBy("phone")}
                    />
                    <FieldError issue={issueFor("phone")} id={errorId("phone")} />
                  </label>

                  <label
                    className={`${styles.field} ${styles.wide}`}
                    htmlFor="viewing-email"
                  >
                    <span>Email</span>
                    <input
                      id="viewing-email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      maxLength={254}
                      required
                      aria-invalid={invalid("email")}
                      aria-describedby={describedBy("email")}
                    />
                    <FieldError issue={issueFor("email")} id={errorId("email")} />
                  </label>

                  <label
                    className={`${styles.field} ${styles.wide}`}
                    htmlFor="viewing-message"
                  >
                    <span>
                      Notes for the team <small>(optional)</small>
                    </span>
                    <textarea
                      id="viewing-message"
                      name="message"
                      minLength={10}
                      maxLength={2000}
                      rows={4}
                      onChange={(event) => setMessageLength(event.target.value.length)}
                      aria-invalid={invalid("message")}
                      aria-describedby={describedBy("message", "viewing-message-count")}
                    />
                    <small id="viewing-message-count" className={styles.counter}>
                      {messageLength} of 2000 characters
                    </small>
                    <FieldError issue={issueFor("message")} id={errorId("message")} />
                  </label>
                </div>

                <div className={styles.honeypot} aria-hidden="true">
                  <label htmlFor="viewing-website">Website</label>
                  <input
                    id="viewing-website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <label className={styles.consent} htmlFor="viewing-privacy-consent">
                  <input
                    id="viewing-privacy-consent"
                    type="checkbox"
                    name="privacyConsent"
                    required
                    aria-invalid={invalid("privacyConsent")}
                    aria-describedby={describedBy("privacyConsent")}
                  />
                  <span>
                    I agree that RC Premier Properties may use these details to respond
                    to this viewing request. No account is created.
                  </span>
                </label>
                <FieldError
                  issue={issueFor("privacyConsent")}
                  id={errorId("privacyConsent")}
                />

                {state.kind === "error" ? (
                  <div
                    ref={errorRef}
                    id="viewing-errors"
                    className={styles.errorMessage}
                    role="alert"
                    tabIndex={-1}
                  >
                    <strong>We could not send the request.</strong> {state.message}
                    {state.issues?.length ? (
                      <ul>
                        {state.issues.map((issue) => (
                          <li key={`${issue.field}-${issue.message}`}>
                            {TOUR_FIELD_LABELS[issue.field] ?? "Form"}: {issue.message}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                <div className={styles.stepActions}>
                  <p className={styles.selection}>
                    Staff confirm every requested time before it becomes an appointment.
                  </p>
                  <button
                    type="submit"
                    className={`${styles.primaryAction} cta`}
                    disabled={state.kind === "pending"}
                  >
                    <RollLabel>
                      {state.kind === "pending" ? "Sending…" : "Send viewing request"}
                    </RollLabel>
                    <Arrow />
                  </button>
                </div>
              </form>
            ) : null}

            {step === "success" ? (
              <div className={styles.step} role="status" aria-live="polite">
                <p className={styles.stepEyebrow}>Request received</p>
                <h2
                  id="viewing-step-heading"
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className={styles.stepHeading}
                >
                  Your preferred viewing time has been sent.
                </h2>
                <dl className={styles.receipt}>
                  <div>
                    <dt>Property</dt>
                    <dd>
                      {property
                        ? `${property.title} · #${property.propertyId}`
                        : `Premier Property #${propertyId.trim()}`}
                    </dd>
                  </div>
                  <div>
                    <dt>Requested date</dt>
                    <dd>{tourDateLabel(selectedDate, "long")}</dd>
                  </div>
                  <div>
                    <dt>Requested time</dt>
                    <dd>{tourTimeLabel(selectedTime)} · Philippine time</dd>
                  </div>
                  {state.inquiryId ? (
                    <div>
                      <dt>Reference</dt>
                      <dd className={styles.reference}>{state.inquiryId}</dd>
                    </div>
                  ) : null}
                </dl>
                <p className={styles.confirmation}>
                  This is not yet a confirmed appointment. RC Premier Properties will
                  contact you to confirm or discuss another schedule.
                </p>
                {state.message ? (
                  <p className={styles.apiMessage}>{state.message}</p>
                ) : null}
                <div className={styles.successActions}>
                  <Link href="/properties" className={`${styles.primaryAction} cta`}>
                    <RollLabel>Browse properties</RollLabel>
                    <Arrow />
                  </Link>
                  {property ? (
                    <Link
                      href={`/properties/${property.slug}`}
                      className={styles.textLink}
                    >
                      <span>Back to property</span>
                      <Arrow />
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
