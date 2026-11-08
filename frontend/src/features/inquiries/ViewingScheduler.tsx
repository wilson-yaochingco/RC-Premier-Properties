"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type RefObject,
} from "react";
import gsap from "gsap";
import {
  viewingRequestDateWindow,
  type PropertyAvailability,
  type PropertyType,
  type PublicPropertyMedia,
  type ValidationIssue,
} from "@rc/shared";
import { RollLabel } from "@/components/ui/RollLabel";
import { PropertyMedia } from "@/features/properties/PropertyMedia";
import {
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
  propertyType: PropertyType;
  typeLabel: string;
  locationLabel: string;
  priceLabel?: string;
  media?: PublicPropertyMedia;
}

/** Current requestable listings offered for selection when the page has no property. */
export type ViewingPropertyOptions =
  { status: "ready"; items: ViewingProperty[] } | { status: "unavailable" };

/** What the server could truthfully resolve from `?propertyId=`. */
export type ViewingPropertyState =
  | { status: "none" }
  | { status: "resolved"; property: ViewingProperty }
  | { status: "not-found"; propertyId: string }
  | { status: "unavailable"; propertyId: string };

type Step = "schedule" | "details" | "success";

const STAGES = ["Property", "Schedule", "Your details", "Request sent"] as const;

/** Details typed so far, kept so Back never empties the form. */
interface SavedDetails {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  consent?: boolean;
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

function Progress({ current }: { current: number }) {
  return (
    <ol className={styles.progress} aria-label="Viewing request progress">
      {STAGES.map((label, index) => (
        <li
          key={label}
          data-state={
            index < current ? "complete" : index === current ? "current" : "upcoming"
          }
          aria-current={index === current ? "step" : undefined}
        >
          <span className={styles.progressNumber}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span>{label}</span>
        </li>
      ))}
    </ol>
  );
}

/** Listings shown before "Show all": two rows of three on desktop. */
const PICKER_PREVIEW = 6;
/** Type chips only help once there is something to narrow. */
const CHIPS_MIN_LISTINGS = 5;

function PropertyThumb({ property }: { property: ViewingProperty }) {
  return (
    <span className={styles.thumb} aria-hidden="true">
      <PropertyMedia media={property.media} label="" sizes="96px" />
    </span>
  );
}

function PropertySummary({
  property,
  onChange,
  headingRef,
}: {
  property: ViewingProperty;
  onChange?: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className={styles.summaryStrip}>
      <PropertyThumb property={property} />
      <div className={styles.stripCopy}>
        <p className={styles.eyebrowSmall}>Viewing request for</p>
        <h2
          id="viewing-property-heading"
          ref={headingRef}
          tabIndex={-1}
          className={styles.stripTitle}
        >
          {property.title}
        </h2>
        <p className={styles.stripMeta}>
          <span>#{property.propertyId}</span>
          <span>{property.locationLabel}</span>
          <span>{property.typeLabel}</span>
          {property.priceLabel ? <span>{property.priceLabel}</span> : null}
        </p>
        {property.availability === "reserved" ? (
          <p className={styles.reservedNote}>
            This listing is reserved. You can still request a viewing; the team will
            confirm whether it can go ahead.
          </p>
        ) : null}
      </div>
      <div className={styles.stripActions}>
        {onChange ? (
          <button type="button" className={styles.quietAction} onClick={onChange}>
            Change property
          </button>
        ) : null}
        <Link href={`/properties/${property.slug}`} className={styles.quietAction}>
          View listing
        </Link>
      </div>
    </div>
  );
}

function PropertyPicker({
  items,
  notice,
  headingRef,
  onPick,
}: {
  items: ViewingProperty[];
  notice?: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onPick: (property: ViewingProperty) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [type, setType] = useState<PropertyType | "all">("all");
  const types = [...new Map(items.map((item) => [item.propertyType, item.typeLabel]))];
  const showChips = types.length > 1 && items.length >= CHIPS_MIN_LISTINGS;
  const filtered =
    type === "all" ? items : items.filter((item) => item.propertyType === type);
  const visible = expanded ? filtered : filtered.slice(0, PICKER_PREVIEW);

  return (
    <div className={styles.picker}>
      <div className={styles.pickerHead}>
        <div className={styles.pickerTitle}>
          <p className={styles.eyebrowSmall}>Select a listing</p>
          <h2
            id="viewing-property-heading"
            ref={headingRef}
            tabIndex={-1}
            className={styles.stripTitle}
          >
            Which property would you like to see?
          </h2>
        </div>
        <Link href="/properties" className={styles.browseAction}>
          Browse all properties
          <Arrow />
        </Link>
      </div>
      {showChips ? (
        <div className={styles.chips} role="group" aria-label="Filter by property type">
          {[["all", "All"] as const, ...types].map(([value, label]) => {
            const count =
              value === "all"
                ? items.length
                : items.filter((item) => item.propertyType === value).length;
            return (
              <button
                key={value}
                type="button"
                className={styles.chip}
                aria-pressed={type === value}
                onClick={() => {
                  setType(value);
                  setExpanded(false);
                }}
              >
                {label}
                <span className={styles.chipCount}>{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}
      <ul className={styles.pickerGrid} aria-label="Current listings">
        {visible.map((property, index) => (
          <li
            key={property.propertyId}
            style={{ "--i": Math.min(index, 8) } as CSSProperties}
          >
            <button
              type="button"
              className={styles.pickerCard}
              aria-label={[
                property.title,
                property.typeLabel,
                property.locationLabel,
                property.priceLabel,
                property.availability === "reserved" ? "reserved" : undefined,
              ]
                .filter(Boolean)
                .join(", ")}
              onClick={() => onPick(property)}
            >
              <span className={styles.cardMedia} aria-hidden="true">
                <PropertyMedia
                  media={property.media}
                  label=""
                  sizes="(max-width: 47.99rem) 40vw, 18rem"
                />
              </span>
              <span className={styles.cardBody}>
                <span className={styles.cardType}>
                  {property.typeLabel}
                  {property.availability === "reserved" ? (
                    <span className={styles.reservedTag}> · Reserved</span>
                  ) : null}
                </span>
                <span className={styles.cardTitle}>{property.title}</span>
                <span className={styles.cardMeta}>{property.locationLabel}</span>
                {property.priceLabel ? (
                  <span className={styles.cardPrice}>{property.priceLabel}</span>
                ) : null}
              </span>
              <span className={styles.cardChoose} aria-hidden="true">
                Choose
                <Arrow />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {filtered.length > PICKER_PREVIEW ? (
        <div className={styles.pickerFoot}>
          <button
            type="button"
            className={styles.quietAction}
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Show fewer" : `Show all ${filtered.length} listings`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** No listing can be offered, so the only useful next step is the property catalogue. */
function PropertyEmpty({ notice }: { notice: string }) {
  return (
    <div className={styles.empty}>
      <p className={styles.eyebrowSmall}>Select a listing</p>
      <h2 id="viewing-property-heading" className={styles.stripTitle}>
        Which property would you like to see?
      </h2>
      <p className={styles.notice}>{notice}</p>
      <Link href="/properties" className={`${styles.primaryAction} cta`}>
        <RollLabel>Browse properties</RollLabel>
        <Arrow />
      </Link>
    </div>
  );
}

export function ViewingScheduler({
  context,
  options = { status: "unavailable" },
}: {
  context: ViewingPropertyState;
  options?: ViewingPropertyOptions;
}) {
  const [today] = useState(() => businessDateInputValue());
  // The shared contract the backend enforces: tomorrow through 90 days, Philippine time.
  const [{ earliest: firstDate, latest: lastDate }] = useState(() =>
    viewingRequestDateWindow(),
  );
  const firstMonth = firstDate.slice(0, 7);
  const lastMonth = lastDate.slice(0, 7);

  const [step, setStep] = useState<Step>("schedule");
  const [month, setMonth] = useState(firstMonth);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [scheduleError, setScheduleError] = useState<string>();
  const [messageLength, setMessageLength] = useState(0);
  const [saved, setSaved] = useState<SavedDetails>({});
  const [leaving, setLeaving] = useState(false);
  const listings = options.status === "ready" ? options.items : [];
  // A property is either supplied by the page or picked from current listings; the
  // backend still validates it on submit.
  const [selectedProperty, setSelectedProperty] = useState<ViewingProperty | undefined>(
    context.status === "resolved" ? context.property : undefined,
  );
  const propertyId = selectedProperty?.propertyId ?? "";

  const { state, issueFor, errorId, describedBy, invalid, reset, submit } =
    useTourRequest("viewing");
  const propertySectionRef = useRef<HTMLElement>(null);
  const propertyHeadingRef = useRef<HTMLHeadingElement>(null);
  const propertyMovedRef = useRef(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const scheduleErrorRef = useRef<HTMLParagraphElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const movedRef = useRef(false);

  const property = selectedProperty;
  const sold = property?.availability === "sold";
  const fixedProperty = context.status === "resolved";
  const { leading, days } = inputMonthDays(month);

  // A step change fades the old step out (see goTo) and the new one in, then moves focus.
  useLayoutEffect(() => {
    if (!movedRef.current) return;
    setLeaving(false);
    const panel = panelRef.current;
    if (!panel || prefersReducedMotion()) return;
    const tween = gsap.fromTo(
      panel,
      { opacity: 0, y: 16 },
      {
        opacity: 1,
        y: 0,
        duration: 0.45,
        ease: "power3.out",
        clearProps: "opacity,transform",
      },
    );
    return () => {
      tween.kill();
      gsap.set(panel, { clearProps: "opacity,transform" });
    };
  }, [step]);

  // Focus waits until the step is no longer inert, or the browser would drop it.
  useEffect(() => {
    if (!movedRef.current || leaving) return;
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [step, leaving]);

  // Choosing or changing a listing swaps this block, so keep focus inside it.
  useEffect(() => {
    if (!propertyMovedRef.current) return;
    propertyMovedRef.current = false;
    propertyHeadingRef.current?.focus();
  }, [selectedProperty]);

  useEffect(() => {
    if (state.kind === "error") errorRef.current?.focus();
  }, [state.kind, state.issues]);

  useEffect(() => {
    if (scheduleError) scheduleErrorRef.current?.focus();
  }, [scheduleError]);

  function goTo(next: Step) {
    movedRef.current = true;
    const panel = panelRef.current;
    if (!panel || prefersReducedMotion()) {
      setStep(next);
      return;
    }
    setLeaving(true);
    gsap.to(panel, {
      opacity: 0,
      y: -12,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => setStep(next),
    });
  }

  function backToSchedule() {
    if (formRef.current) {
      const data = new FormData(formRef.current);
      setSaved({
        name: String(data.get("name") ?? ""),
        phone: String(data.get("phone") ?? ""),
        email: String(data.get("email") ?? ""),
        message: String(data.get("message") ?? ""),
        consent: data.get("privacyConsent") === "on",
      });
    }
    reset();
    goTo("schedule");
  }

  function continueToDetails() {
    if (!propertyId) {
      setScheduleError("Choose a property to continue.");
      propertySectionRef.current?.scrollIntoView({ block: "center" });
      return;
    }
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
    const accepted = await submit(
      event.currentTarget,
      { propertyId, requestedDate: selectedDate, requestedTime: selectedTime },
      { propertyFromContext: true },
    );
    if (accepted) goTo("success");
  }

  return (
    <div className={styles.card}>
      <section
        ref={propertySectionRef}
        className={styles.property}
        aria-labelledby="viewing-property-heading"
      >
        {property ? (
          <PropertySummary
            property={property}
            headingRef={propertyHeadingRef}
            onChange={
              fixedProperty || step !== "schedule"
                ? undefined
                : () => {
                    propertyMovedRef.current = true;
                    setSelectedProperty(undefined);
                  }
            }
          />
        ) : listings.length > 0 ? (
          <PropertyPicker
            items={listings}
            notice={
              context.status === "not-found"
                ? `We couldn’t find a current listing numbered “${context.propertyId}”. Choose one below.`
                : context.status === "unavailable"
                  ? "That listing couldn’t be loaded right now. Choose one below."
                  : undefined
            }
            headingRef={propertyHeadingRef}
            onPick={(next) => {
              propertyMovedRef.current = true;
              setSelectedProperty(next);
              setScheduleError(undefined);
            }}
          />
        ) : (
          <PropertyEmpty
            notice={
              options.status === "unavailable" || context.status === "unavailable"
                ? "Current listings couldn’t be loaded right now. Browse properties and request a viewing from the listing page."
                : context.status === "not-found"
                  ? `We couldn’t find a current listing numbered “${context.propertyId}”. Browse properties to find a current one.`
                  : "No listings are open for viewing requests right now. Browse all properties, or get in touch below."
            }
          />
        )}
      </section>

      {!property ? null : (
        <section
          className={styles.scheduler}
          aria-labelledby="viewing-step-heading"
          data-enter
        >
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
              <Progress
                current={step === "schedule" ? 1 : step === "details" ? 2 : 3}
              />

              <div ref={panelRef} inert={leaving}>
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
                      </fieldset>

                      <fieldset className={styles.timeFieldset}>
                        <legend className={styles.fieldsetLabel}>Preferred time</legend>
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
                          Requested times are subject to confirmation by our team.
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
                    ref={formRef}
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
                          {tourTimeLabel(selectedTime)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={styles.editAction}
                        onClick={backToSchedule}
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
                          defaultValue={saved.name}
                          placeholder="Enter your full name"
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
                          defaultValue={saved.phone}
                          placeholder="e.g. 0917 123 4567"
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
                          defaultValue={saved.email}
                          placeholder="you@example.com"
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
                          defaultValue={saved.message}
                          placeholder="Anything you'd like us to know before your visit?"
                          minLength={10}
                          maxLength={2000}
                          rows={4}
                          onChange={(event) =>
                            setMessageLength(event.target.value.length)
                          }
                          aria-invalid={invalid("message")}
                          aria-describedby={describedBy(
                            "message",
                            "viewing-message-count",
                          )}
                        />
                        <small id="viewing-message-count" className={styles.counter}>
                          {messageLength} of 2000 characters
                        </small>
                        <FieldError
                          issue={issueFor("message")}
                          id={errorId("message")}
                        />
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
                        defaultChecked={saved.consent}
                        required
                        aria-invalid={invalid("privacyConsent")}
                        aria-describedby={describedBy("privacyConsent")}
                      />
                      <span>
                        I agree that RC Premier Properties may use these details to
                        respond to this viewing request. No account is created. See our{" "}
                        <Link
                          href="/privacy"
                          className="privacy-link"
                          target="_blank"
                          rel="noopener"
                        >
                          Privacy Policy
                        </Link>
                        .
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
                        {state.propertyUnavailable ? (
                          <>
                            <strong>{state.message}</strong>{" "}
                            <Link href="/properties">Browse current properties</Link>
                          </>
                        ) : (
                          <>
                            <strong>We could not send the request.</strong>{" "}
                            {state.message}
                          </>
                        )}
                        {state.issues?.length ? (
                          <ul>
                            {state.issues.map((issue) => (
                              <li key={`${issue.field}-${issue.message}`}>
                                {TOUR_FIELD_LABELS[issue.field] ?? "Form"}:{" "}
                                {issue.message}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}

                    <div className={styles.stepActions}>
                      <p className={styles.selection}>
                        Staff confirm every requested time before it becomes an
                        appointment.
                      </p>
                      <button
                        type="button"
                        className={styles.quietAction}
                        onClick={backToSchedule}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className={`${styles.primaryAction} cta`}
                        disabled={state.kind === "pending"}
                      >
                        <RollLabel>
                          {state.kind === "pending"
                            ? "Sending…"
                            : "Send viewing request"}
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
                        <dd>{tourTimeLabel(selectedTime)}</dd>
                      </div>
                      {state.inquiryId ? (
                        <div>
                          <dt>Reference</dt>
                          <dd className={styles.reference}>{state.inquiryId}</dd>
                        </div>
                      ) : null}
                    </dl>
                    <p className={styles.confirmation}>
                      This is not yet a confirmed appointment. RC Premier Properties
                      will contact you to confirm or discuss another schedule.
                    </p>
                    {state.message ? (
                      <p className={styles.apiMessage}>{state.message}</p>
                    ) : null}
                    <div className={styles.successActions}>
                      <Link
                        href="/properties"
                        className={`${styles.primaryAction} cta`}
                      >
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
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
