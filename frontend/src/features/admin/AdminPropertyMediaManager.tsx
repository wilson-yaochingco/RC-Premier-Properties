"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAX_PROPERTY_IMAGES,
  type AdminPropertyDetail,
  type AdminPropertyMediaInput,
  type ValidationIssue,
} from "@rc/shared";
import { PropertyMedia } from "@/features/properties/PropertyMedia";
import { DEVELOPMENT_SAMPLE_MEDIA } from "@/features/properties/development-sample-media";
import { ApiClientError } from "@/services/api-client";
import { useAdminSession } from "./AdminShell";
import { updatePropertyMedia } from "./admin.service";
import styles from "./admin.module.css";

function editableMedia(property: AdminPropertyDetail): AdminPropertyMediaInput[] {
  return property.gallery.flatMap((item, index) =>
    item.kind === "image" && item.url
      ? [
          {
            id: item.id ?? `legacy-${index}-${property.id}`,
            kind: "image" as const,
            url: item.url,
            alt: item.alt,
            ...(item.caption ? { caption: item.caption } : {}),
            source: item.source ?? "production",
            ...(item.sourceUrl ? { sourceUrl: item.sourceUrl } : {}),
            ...(item.attribution ? { attribution: item.attribution } : {}),
          },
        ]
      : [],
  );
}

function initialCoverId(
  property: AdminPropertyDetail,
  media: AdminPropertyMediaInput[],
): string {
  return (
    property.coverMedia?.id ??
    media.find((item) => item.url === property.coverMedia?.url)?.id ??
    media[0]?.id ??
    ""
  );
}

function issueFor(issues: ValidationIssue[], index: number, field: string) {
  return issues.find((issue) => issue.field === `media.${index}.${field}`)?.message;
}

export function AdminPropertyMediaManager({
  property,
  onSaved,
}: {
  property: AdminPropertyDetail;
  onSaved: (property: AdminPropertyDetail) => void;
}) {
  const { session, expireSession } = useAdminSession();
  const initial = editableMedia(property);
  const [media, setMedia] = useState<AdminPropertyMediaInput[]>(initial);
  const [coverMediaId, setCoverMediaId] = useState(() =>
    initialCoverId(property, initial),
  );
  const [state, setState] = useState<{
    kind: "idle" | "pending" | "success" | "error";
    message?: string;
    issues?: ValidationIssue[];
  }>({ kind: "idle" });
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.kind === "error") errorRef.current?.focus();
  }, [state.kind]);

  function updateItem(index: number, update: Partial<AdminPropertyMediaInput>) {
    setMedia((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...update } : item,
      ),
    );
    setState({ kind: "idle" });
  }

  function addProductionImage() {
    if (media.length >= MAX_PROPERTY_IMAGES) return;
    const id = `media-${crypto.randomUUID()}`;
    setMedia((items) => [
      ...items,
      { id, kind: "image", url: "", alt: "", source: "production" },
    ]);
    if (!coverMediaId) setCoverMediaId(id);
    setState({ kind: "idle" });
  }

  function addSample(sample: AdminPropertyMediaInput) {
    if (media.length >= MAX_PROPERTY_IMAGES) return;
    const id = `media-${crypto.randomUUID()}`;
    setMedia((items) => [...items, { ...sample, id }]);
    if (!coverMediaId) setCoverMediaId(id);
    setState({ kind: "idle" });
  }

  function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= media.length) return;
    setMedia((items) => {
      const next = [...items];
      const [item] = next.splice(index, 1);
      if (item) next.splice(destination, 0, item);
      return next;
    });
    setState({ kind: "idle" });
  }

  function remove(index: number) {
    const item = media[index];
    if (!item || !window.confirm(`Remove image ${index + 1} from this property?`))
      return;
    const next = media.filter((_, itemIndex) => itemIndex !== index);
    setMedia(next);
    if (item.id === coverMediaId) setCoverMediaId(next[0]?.id ?? "");
    setState({ kind: "idle" });
  }

  async function save() {
    setState({ kind: "pending" });
    try {
      const updated = await updatePropertyMedia(
        property.id,
        {
          expectedVersion: property.version,
          media,
          ...(media.length > 0 ? { coverMediaId } : {}),
        },
        session.csrfToken,
      );
      const savedMedia = editableMedia(updated);
      setMedia(savedMedia);
      setCoverMediaId(initialCoverId(updated, savedMedia));
      onSaved(updated);
      setState({ kind: "success", message: "Property media saved." });
    } catch (error) {
      if (error instanceof ApiClientError && error.statusCode === 401) {
        expireSession();
        return;
      }
      setState({
        kind: "error",
        message:
          error instanceof ApiClientError
            ? error.message
            : "Property media could not be saved.",
        issues: error instanceof ApiClientError ? error.response.issues : undefined,
      });
    }
  }

  const issues = state.issues ?? [];

  return (
    <section className={styles.mediaManager} aria-labelledby="property-media-title">
      <div className={styles.mediaManagerHeader}>
        <div>
          <p className={styles.eyebrow}>Property media</p>
          <h2 id="property-media-title">Images and cover</h2>
          <p>
            Array order controls the gallery. Production references are limited to safe
            local image paths until a storage provider is approved.
          </p>
        </div>
        <span>
          {media.length} / {MAX_PROPERTY_IMAGES} images
        </span>
      </div>

      {state.kind === "error" ? (
        <div ref={errorRef} className={styles.errorSummary} role="alert" tabIndex={-1}>
          <strong>We could not save the property media.</strong>
          <p>{state.message}</p>
          {issues.length > 0 ? (
            <ul>
              {issues.map((issue) => (
                <li key={`${issue.field}-${issue.message}`}>
                  {issue.field}: {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {state.kind === "success" ? (
        <div className={styles.successMessage} role="status">
          <strong>{state.message}</strong>
        </div>
      ) : null}

      {media.length === 0 ? (
        <div className={styles.mediaEmpty}>
          <PropertyMedia label="PROPERTY IMAGE" />
          <div>
            <h3>No property images</h3>
            <p>Public cards and details will continue to show the neutral fallback.</p>
          </div>
        </div>
      ) : (
        <ol className={styles.mediaList}>
          {media.map((item, index) => {
            const urlError = issueFor(issues, index, "url");
            const altError = issueFor(issues, index, "alt");
            return (
              <li key={item.id} className={styles.mediaItem}>
                <div className={styles.mediaPreview}>
                  <PropertyMedia media={item} label={`PROPERTY IMAGE ${index + 1}`} />
                  <span>Position {index + 1}</span>
                </div>
                <div className={styles.mediaFields}>
                  <label>
                    <span>Image URL / storage reference</span>
                    <input
                      value={item.url}
                      maxLength={2048}
                      aria-invalid={Boolean(urlError)}
                      onChange={(event) =>
                        updateItem(index, { url: event.target.value })
                      }
                    />
                    {urlError ? <small>{urlError}</small> : null}
                  </label>
                  <label>
                    <span>Alternative text</span>
                    <input
                      value={item.alt}
                      maxLength={240}
                      aria-invalid={Boolean(altError)}
                      onChange={(event) =>
                        updateItem(index, { alt: event.target.value })
                      }
                    />
                    {altError ? <small>{altError}</small> : null}
                  </label>
                  <label>
                    <span>Caption (optional)</span>
                    <input
                      value={item.caption ?? ""}
                      maxLength={500}
                      onChange={(event) =>
                        updateItem(index, {
                          caption: event.target.value || undefined,
                        })
                      }
                    />
                  </label>
                  {item.source === "development-sample" ? (
                    <div className={styles.sampleDetails}>
                      <strong>Development sample — never actual listing media</strong>
                      <span>{item.attribution}</span>
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                        Verify source and license
                      </a>
                    </div>
                  ) : (
                    <p className={styles.productionMediaLabel}>Production media</p>
                  )}
                </div>
                <div className={styles.mediaActions}>
                  <label>
                    <input
                      type="radio"
                      name="coverMedia"
                      checked={coverMediaId === item.id}
                      onChange={() => setCoverMediaId(item.id)}
                    />
                    Cover image
                  </label>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    disabled={index === media.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    Move down
                  </button>
                  <button type="button" onClick={() => remove(index)}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className={styles.mediaAddActions}>
        <button
          type="button"
          disabled={media.length >= MAX_PROPERTY_IMAGES || state.kind === "pending"}
          onClick={addProductionImage}
        >
          Add production image reference
        </button>
        <details>
          <summary>Add licensed development sample</summary>
          <div className={styles.samplePicker}>
            {DEVELOPMENT_SAMPLE_MEDIA.map((sample) => (
              <button
                key={sample.id}
                type="button"
                disabled={
                  media.length >= MAX_PROPERTY_IMAGES || state.kind === "pending"
                }
                onClick={() => addSample(sample)}
              >
                <PropertyMedia media={sample} sizes="9rem" />
                <span>{sample.alt}</span>
              </button>
            ))}
          </div>
        </details>
      </div>

      <button
        type="button"
        className={styles.submit}
        disabled={state.kind === "pending"}
        onClick={save}
      >
        {state.kind === "pending" ? "Saving media…" : "Save property media"}
      </button>
    </section>
  );
}
