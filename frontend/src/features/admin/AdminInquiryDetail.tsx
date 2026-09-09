"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  INQUIRY_WORKFLOW_STATUSES,
  VIEWING_TIME_ZONE,
  type ViewingRequestStatus,
  type ViewingStaffTransitionStatus,
  type AdminInquiryDetail,
  type InquiryWorkflowStatus,
} from "@rc/shared";
import { ApiClientError } from "@/services/api-client";
import { formatBusinessDateTime } from "@/lib/date-time";
import {
  addAdminInquiryNote,
  getAdminInquiry,
  transitionAdminInquiry,
  updateAdminInquiryStatus,
  updateAdminViewingRequest,
} from "./admin.service";
import { useAdminSession } from "./AdminShell";
import styles from "./admin.module.css";

type DetailState =
  | { kind: "loading" }
  | { kind: "ready"; inquiry: AdminInquiryDetail }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

function label(value: string): string {
  return value.replaceAll("-", " ").replace(/^./, (first) => first.toUpperCase());
}

function dateTime(value: string): string {
  return formatBusinessDateTime(value);
}

function viewingDateTime(date: string, time: string): string {
  return `${new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: VIEWING_TIME_ZONE,
  }).format(new Date(`${date}T${time}:00+08:00`))} (Philippine time)`;
}

const VIEWING_TRANSITIONS: Record<
  ViewingRequestStatus,
  readonly ViewingStaffTransitionStatus[]
> = {
  requested: ["confirmed", "reschedule-requested", "canceled"],
  "reschedule-requested": ["confirmed", "canceled"],
  confirmed: ["reschedule-requested", "completed", "canceled"],
  completed: [],
  canceled: [],
};

export function AdminInquiryDetailView({ inquiryId }: { inquiryId: string }) {
  const { session, expireSession } = useAdminSession();
  const [state, setState] = useState<DetailState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string }>();

  const handleError = useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof ApiClientError && error.statusCode === 401) {
        expireSession();
        return;
      }
      setNotice({
        kind: "error",
        text: error instanceof ApiClientError ? error.message : fallback,
      });
    },
    [expireSession],
  );

  useEffect(() => {
    const controller = new AbortController();
    getAdminInquiry(inquiryId, controller.signal)
      .then((inquiry) => setState({ kind: "ready", inquiry }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiClientError && error.statusCode === 401) {
          expireSession();
          return;
        }
        if (error instanceof ApiClientError && error.statusCode === 403) {
          setState({ kind: "forbidden" });
          return;
        }
        setState({
          kind: "error",
          message:
            error instanceof ApiClientError
              ? error.message
              : "The inquiry details could not be loaded.",
        });
      });
    return () => controller.abort();
  }, [attempt, expireSession, inquiryId]);

  async function changeStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind !== "ready") return;
    const status = new FormData(event.currentTarget).get(
      "status",
    ) as InquiryWorkflowStatus;
    setPending(true);
    setNotice(undefined);
    try {
      const inquiry = await updateAdminInquiryStatus(
        inquiryId,
        { status, expectedVersion: state.inquiry.version },
        session.csrfToken,
      );
      setState({ kind: "ready", inquiry });
      setNotice({ kind: "success", text: `Status changed to ${label(status)}.` });
    } catch (error) {
      handleError(error, "The inquiry status could not be updated.");
    } finally {
      setPending(false);
    }
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind !== "ready") return;
    const form = event.currentTarget;
    const note = String(new FormData(form).get("note") ?? "").trim();
    if (!note) return;
    setPending(true);
    setNotice(undefined);
    try {
      const inquiry = await addAdminInquiryNote(
        inquiryId,
        { note, expectedVersion: state.inquiry.version },
        session.csrfToken,
      );
      form.reset();
      setState({ kind: "ready", inquiry });
      setNotice({ kind: "success", text: "Internal note added." });
    } catch (error) {
      handleError(error, "The internal note could not be added.");
    } finally {
      setPending(false);
    }
  }

  async function changeViewingRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind !== "ready" || !state.inquiry.viewingRequest) return;
    const data = new FormData(event.currentTarget);
    const status = String(data.get("viewingStatus")) as ViewingStaffTransitionStatus;
    if (
      status === "canceled" &&
      !window.confirm(
        "Cancel this viewing request? The appointment will no longer be treated as scheduled.",
      )
    ) {
      return;
    }
    setPending(true);
    setNotice(undefined);
    try {
      const inquiry = await updateAdminViewingRequest(
        inquiryId,
        {
          status,
          requestedDate: String(data.get("requestedDate") ?? ""),
          requestedTime: String(data.get("requestedTime") ?? ""),
          expectedVersion: state.inquiry.version,
        },
        session.csrfToken,
      );
      setState({ kind: "ready", inquiry });
      setNotice({
        kind: "success",
        text: `Viewing request changed to ${label(status)}.`,
      });
    } catch (error) {
      handleError(error, "The viewing request could not be updated.");
    } finally {
      setPending(false);
    }
  }

  async function transition(action: "spam" | "not-spam" | "archive" | "restore") {
    if (state.kind !== "ready") return;
    if (
      action === "archive" &&
      !window.confirm(
        "Archive this inquiry? It will leave active queues but remain recoverable for retention review.",
      )
    ) {
      return;
    }
    setPending(true);
    setNotice(undefined);
    try {
      const inquiry = await transitionAdminInquiry(
        inquiryId,
        action,
        { expectedVersion: state.inquiry.version },
        session.csrfToken,
      );
      setState({ kind: "ready", inquiry });
      setNotice({
        kind: "success",
        text: {
          spam: "Inquiry moved to spam quarantine.",
          "not-spam": "Legitimate inquiry restored to its previous status.",
          archive: "Inquiry archived.",
          restore: "Inquiry restored from the archive.",
        }[action],
      });
    } catch (error) {
      handleError(error, "The inquiry could not be updated.");
    } finally {
      setPending(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <div className={styles.panel} aria-busy="true">
        Loading private inquiry…
      </div>
    );
  }
  if (state.kind === "forbidden") {
    return (
      <div className={styles.panel} role="alert">
        <h1>Permission required</h1>
        <p>Your staff session cannot read this inquiry.</p>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className={styles.panel} role="alert">
        <h1>Inquiry unavailable</h1>
        <p>{state.message}</p>
        <button
          type="button"
          onClick={() => {
            setState({ kind: "loading" });
            setAttempt((value) => value + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  const { inquiry } = state;
  const locked = Boolean(inquiry.archivedAt) || inquiry.status === "spam";
  const canUpdate = session.permissions.includes("inquiry:update");
  return (
    <section className={styles.page} aria-labelledby="inquiry-detail-title">
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Private inquiry</p>
          <h1 id="inquiry-detail-title">{inquiry.name}</h1>
          <p>
            Received{" "}
            <time dateTime={inquiry.createdAt}>{dateTime(inquiry.createdAt)}</time> ·
            Updated{" "}
            <time dateTime={inquiry.updatedAt}>{dateTime(inquiry.updatedAt)}</time>
          </p>
        </div>
        <Link href="/admin/inquiries">Back to inquiries</Link>
      </div>

      {notice ? (
        <div
          className={
            notice.kind === "success" ? styles.successMessage : styles.errorSummary
          }
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.text}
        </div>
      ) : null}

      <div className={styles.detailGrid}>
        <article className={styles.detailCard}>
          <div className={styles.detailHeading}>
            <h2>Inquiry details</h2>
            <span
              className={`${styles.statusBadge} ${
                inquiry.status === "spam" ? styles.status_spam : ""
              }`}
            >
              {label(inquiry.status)}
            </span>
          </div>
          <dl className={styles.detailList}>
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
              </dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{inquiry.phone ?? "Not supplied"}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{label(inquiry.inquiryType)}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{label(inquiry.source)}</dd>
            </div>
            <div>
              <dt>Property</dt>
              <dd>
                {inquiry.propertyId
                  ? `Premier Property #${inquiry.propertyId}`
                  : "Not property-specific"}
              </dd>
            </div>
            <div>
              <dt>Subject</dt>
              <dd>{inquiry.subject ?? "No subject"}</dd>
            </div>
            <div>
              <dt>Consent recorded</dt>
              <dd>
                <time dateTime={inquiry.privacyConsentAt}>
                  {dateTime(inquiry.privacyConsentAt)}
                </time>
              </dd>
            </div>
            {inquiry.viewingRequest ? (
              <>
                <div>
                  <dt>Viewing status</dt>
                  <dd>{label(inquiry.viewingRequest.status)}</dd>
                </div>
                <div>
                  <dt>Requested schedule</dt>
                  <dd>
                    {viewingDateTime(
                      inquiry.viewingRequest.requestedDate,
                      inquiry.viewingRequest.requestedTime,
                    )}
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
          {inquiry.message ? (
            <>
              <h3>Message</h3>
              <p className={styles.privateMessage}>{inquiry.message}</p>
            </>
          ) : null}
        </article>

        <aside className={styles.workflowCard} aria-label="Inquiry workflow">
          <h2>Workflow</h2>
          {!canUpdate ? (
            <p className={styles.archiveNotice} role="alert">
              Your staff session can read this inquiry but cannot update it.
            </p>
          ) : null}
          {inquiry.archivedAt ? (
            <p className={styles.archiveNotice}>
              Archived{" "}
              <time dateTime={inquiry.archivedAt}>{dateTime(inquiry.archivedAt)}</time>
            </p>
          ) : null}
          {inquiry.viewingRequest ? (
            <form
              key={`${inquiry.viewingRequest.status}-${inquiry.viewingRequest.requestedDate}-${inquiry.viewingRequest.requestedTime}`}
              className={styles.compactForm}
              onSubmit={changeViewingRequest}
            >
              <h3>Viewing appointment</h3>
              <p>Requested times remain unconfirmed until the status is Confirmed.</p>
              <label htmlFor="viewing-request-date">Requested date</label>
              <input
                id="viewing-request-date"
                name="requestedDate"
                type="date"
                defaultValue={inquiry.viewingRequest.requestedDate}
                required
                disabled={pending || locked || !canUpdate}
              />
              <label htmlFor="viewing-request-time">Requested time</label>
              <input
                id="viewing-request-time"
                name="requestedTime"
                type="time"
                defaultValue={inquiry.viewingRequest.requestedTime}
                required
                disabled={pending || locked || !canUpdate}
              />
              {VIEWING_TRANSITIONS[inquiry.viewingRequest.status].length > 0 ? (
                <>
                  <label htmlFor="viewing-request-status">Viewing status</label>
                  <select
                    id="viewing-request-status"
                    name="viewingStatus"
                    defaultValue={VIEWING_TRANSITIONS[inquiry.viewingRequest.status][0]}
                    disabled={pending || locked || !canUpdate}
                  >
                    {VIEWING_TRANSITIONS[inquiry.viewingRequest.status].map(
                      (status) => (
                        <option key={status} value={status}>
                          {label(status)}
                        </option>
                      ),
                    )}
                  </select>
                  <button type="submit" disabled={pending || locked || !canUpdate}>
                    Update viewing request
                  </button>
                </>
              ) : (
                <p className={styles.archiveNotice}>
                  This viewing lifecycle is complete and cannot be changed.
                </p>
              )}
            </form>
          ) : null}
          <form className={styles.compactForm} onSubmit={changeStatus}>
            <label htmlFor="inquiry-status">Status</label>
            <select
              id="inquiry-status"
              name="status"
              defaultValue={inquiry.status === "spam" ? "new" : inquiry.status}
              disabled={pending || locked || !canUpdate}
            >
              {INQUIRY_WORKFLOW_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {label(status)}
                </option>
              ))}
            </select>
            <button type="submit" disabled={pending || locked || !canUpdate}>
              Update status
            </button>
          </form>
          <div className={styles.workflowActions}>
            {inquiry.status === "spam" ? (
              <button
                type="button"
                disabled={pending || Boolean(inquiry.archivedAt) || !canUpdate}
                onClick={() => transition("not-spam")}
              >
                Mark not spam
              </button>
            ) : (
              <button
                type="button"
                disabled={pending || Boolean(inquiry.archivedAt) || !canUpdate}
                onClick={() => transition("spam")}
              >
                Mark spam
              </button>
            )}
            {inquiry.archivedAt ? (
              <button
                type="button"
                disabled={pending || !canUpdate}
                onClick={() => transition("restore")}
              >
                Restore inquiry
              </button>
            ) : (
              <button
                type="button"
                disabled={pending || !canUpdate}
                onClick={() => transition("archive")}
              >
                Archive inquiry
              </button>
            )}
          </div>
        </aside>
      </div>

      <section className={styles.detailCard} aria-labelledby="internal-notes-title">
        <h2 id="internal-notes-title">Internal notes</h2>
        <p>
          Visible to authorized staff only. Do not copy unnecessary personal data here.
        </p>
        <form className={styles.noteForm} onSubmit={addNote}>
          <label htmlFor="inquiry-note">Add a follow-up note</label>
          <textarea
            id="inquiry-note"
            name="note"
            rows={4}
            maxLength={1000}
            required
            disabled={pending || Boolean(inquiry.archivedAt) || !canUpdate}
          />
          <button
            type="submit"
            disabled={pending || Boolean(inquiry.archivedAt) || !canUpdate}
          >
            Add note
          </button>
        </form>
        {inquiry.internalNotes.length === 0 ? (
          <p>No internal notes yet.</p>
        ) : (
          <ol className={styles.timeline}>
            {[...inquiry.internalNotes].reverse().map((note) => (
              <li key={note.id}>
                <time dateTime={note.createdAt}>{dateTime(note.createdAt)}</time>
                <p>{note.note}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={styles.detailCard} aria-labelledby="status-history-title">
        <h2 id="status-history-title">Status history</h2>
        <ol className={styles.timeline}>
          {[...inquiry.statusHistory].reverse().map((entry, index) => (
            <li key={`${entry.changedAt}-${index}`}>
              <time dateTime={entry.changedAt}>{dateTime(entry.changedAt)}</time>
              <p>
                {entry.fromStatus
                  ? `${label(entry.fromStatus)} → ${label(entry.toStatus)}`
                  : `Created as ${label(entry.toStatus)}`}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {inquiry.viewingRequest ? (
        <section className={styles.detailCard} aria-labelledby="viewing-history-title">
          <h2 id="viewing-history-title">Viewing history</h2>
          <ol className={styles.timeline}>
            {[...inquiry.viewingRequest.statusHistory].reverse().map((entry, index) => (
              <li key={`${entry.changedAt}-${index}`}>
                <time dateTime={entry.changedAt}>{dateTime(entry.changedAt)}</time>
                <p>
                  {entry.fromStatus
                    ? `${label(entry.fromStatus)} → ${label(entry.toStatus)}`
                    : `Created as ${label(entry.toStatus)}`}
                  {" · "}
                  {viewingDateTime(entry.requestedDate, entry.requestedTime)}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </section>
  );
}
