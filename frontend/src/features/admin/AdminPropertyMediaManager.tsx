"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  MAX_PROPERTY_IMAGES,
  type AdminPropertyDetail,
  type AdminPropertyMediaInput,
  type ValidationIssue,
} from "@rc/shared";
import { PropertyMedia } from "@/features/properties/PropertyMedia";
import { ApiClientError } from "@/services/api-client";
import { useAdminSession } from "./AdminShell";
import { updatePropertyMedia, uploadPropertyImage } from "./admin.service";
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
            ...(item.focalPoint ? { focalPoint: item.focalPoint } : {}),
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

interface PendingUpload {
  id: string;
  file: File;
  previewUrl: string;
  alt: string;
  caption: string;
  state: "ready" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  errorField?: "alt" | "file";
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
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const uploadsRef = useRef<PendingUpload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [reorderMessage, setReorderMessage] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.kind === "error") errorRef.current?.focus();
  }, [state.kind]);

  useEffect(() => {
    uploadsRef.current = uploads;
  }, [uploads]);

  useEffect(
    () => () =>
      uploadsRef.current.forEach((upload) => URL.revokeObjectURL(upload.previewUrl)),
    [],
  );

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  function addFiles(files: FileList | File[]) {
    const queued = uploads.filter((upload) => upload.state !== "success").length;
    const available = Math.max(0, MAX_PROPERTY_IMAGES - media.length - queued);
    const next = Array.from(files)
      .slice(0, available)
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        alt: "",
        caption: "",
        state: "ready" as const,
        progress: 0,
      }));
    setUploads((items) => [...items, ...next]);
  }

  function updateUpload(id: string, update: Partial<PendingUpload>) {
    setUploads((items) =>
      items.map((item) => (item.id === id ? { ...item, ...update } : item)),
    );
  }

  async function uploadFiles() {
    if (dirty) {
      setState({
        kind: "error",
        message: "Save the current media edits before uploading new photos.",
      });
      return;
    }
    let currentVersion = property.version;
    let successfulProperty = property;
    for (const upload of uploads.filter((item) => item.state !== "success")) {
      if (!upload.alt.trim()) {
        updateUpload(upload.id, {
          state: "error",
          error: "Alternative text is required.",
          errorField: "alt",
        });
        continue;
      }
      updateUpload(upload.id, {
        state: "uploading",
        progress: 0,
        error: undefined,
        errorField: undefined,
      });
      try {
        successfulProperty = await uploadPropertyImage(
          property.id,
          currentVersion,
          upload.file,
          upload.alt.trim(),
          upload.caption,
          session.csrfToken,
          (progress) => updateUpload(upload.id, { progress }),
        );
        currentVersion = successfulProperty.version;
        updateUpload(upload.id, { state: "success", progress: 100 });
        const savedMedia = editableMedia(successfulProperty);
        setMedia(savedMedia);
        setCoverMediaId(initialCoverId(successfulProperty, savedMedia));
        onSaved(successfulProperty);
      } catch (error) {
        if (error instanceof ApiClientError && error.statusCode === 401) {
          expireSession();
          return;
        }
        updateUpload(upload.id, {
          state: "error",
          error:
            error instanceof ApiClientError ? error.message : "Image upload failed.",
          errorField: "file",
        });
      }
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function updateItem(index: number, update: Partial<AdminPropertyMediaInput>) {
    setMedia((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...update } : item,
      ),
    );
    setState({ kind: "idle" });
    setDirty(true);
  }

  function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= media.length) return;
    const movedId = media[index]?.id;
    setMedia((items) => {
      const next = [...items];
      const [item] = next.splice(index, 1);
      if (item) next.splice(destination, 0, item);
      return next;
    });
    setState({ kind: "idle" });
    setDirty(true);
    setReorderMessage(
      `Image moved to position ${destination + 1}. Save property media to keep this order.`,
    );
    window.requestAnimationFrame(() => {
      const movedItem = Array.from(
        document.querySelectorAll<HTMLElement>("[data-media-item]"),
      ).find((element) => element.dataset.mediaId === movedId);
      const preferredDirection = destination === 0 ? "later" : "earlier";
      movedItem
        ?.querySelector<HTMLButtonElement>(
          `button[data-move-direction="${preferredDirection}"]:not([disabled])`,
        )
        ?.focus();
    });
  }

  function remove(index: number) {
    const item = media[index];
    if (!item || !window.confirm(`Remove image ${index + 1} from this property?`))
      return;
    const next = media.filter((_, itemIndex) => itemIndex !== index);
    setMedia(next);
    if (item.id === coverMediaId) setCoverMediaId(next[0]?.id ?? "");
    setState({ kind: "idle" });
    setDirty(true);
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
      setDirty(false);
      setReorderMessage("");
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
            Upload real photos from your device, then arrange the gallery, choose a
            cover, and set focal points. Development uploads use isolated local storage;
            production storage remains provider-gated.
          </p>
        </div>
        <span role="status">
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
      <p className={styles.srOnly} role="status">
        {reorderMessage}
      </p>

      <div
        className={`${styles.uploadZone} ${dragging ? styles.uploadZoneDragging : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div>
          <strong>Upload Photos</strong>
          <p>Choose PNG, JPEG, or WebP images up to 12 MB each, or drop files here.</p>
        </div>
        <label className={styles.uploadPicker}>
          Choose Photos
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {uploads.length > 0 ? (
        <ol className={styles.uploadList}>
          {uploads.map((upload) => {
            const nameId = `upload-${upload.id}-name`;
            const statusId = `upload-${upload.id}-status`;
            return (
              <li key={upload.id} aria-labelledby={nameId} aria-describedby={statusId}>
                {/* Browser-created preview only; the server still validates the bytes. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={upload.previewUrl} alt="" />
                <div>
                  <strong id={nameId}>{upload.file.name}</strong>
                  <label>
                    <span>Alternative text</span>
                    <input
                      value={upload.alt}
                      maxLength={240}
                      disabled={
                        upload.state === "uploading" || upload.state === "success"
                      }
                      aria-invalid={upload.errorField === "alt"}
                      aria-describedby={
                        upload.errorField === "alt" ? statusId : undefined
                      }
                      onChange={(event) =>
                        updateUpload(upload.id, {
                          alt: event.target.value,
                          state: "ready",
                          error: undefined,
                          errorField: undefined,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>Caption (optional)</span>
                    <input
                      value={upload.caption}
                      maxLength={500}
                      disabled={
                        upload.state === "uploading" || upload.state === "success"
                      }
                      onChange={(event) =>
                        updateUpload(upload.id, { caption: event.target.value })
                      }
                    />
                  </label>
                  <progress
                    max="100"
                    value={upload.progress}
                    aria-label={`Upload progress for ${upload.file.name}`}
                    aria-describedby={statusId}
                  >
                    {upload.progress}%
                  </progress>
                  <span
                    id={statusId}
                    role={upload.state === "error" ? "alert" : "status"}
                  >
                    {upload.state === "ready"
                      ? "Ready"
                      : upload.state === "uploading"
                        ? `Uploading ${upload.progress}%`
                        : upload.state === "success"
                          ? "Uploaded"
                          : upload.error}
                  </span>
                </div>
                {upload.state !== "uploading" && upload.state !== "success" ? (
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(upload.previewUrl);
                      setUploads((items) =>
                        items.filter((item) => item.id !== upload.id),
                      );
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}

      {uploads.some((upload) => upload.state !== "success") ? (
        <button
          type="button"
          className={styles.submit}
          disabled={dirty}
          onClick={uploadFiles}
        >
          {uploads.some((upload) => upload.state === "error")
            ? "Retry Uploads"
            : "Upload Photos"}
        </button>
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
            const urlErrorId = `media-${item.id}-url-error`;
            const altErrorId = `media-${item.id}-alt-error`;
            return (
              <li
                key={item.id}
                className={styles.mediaItem}
                data-media-item
                data-media-id={item.id}
              >
                <div className={styles.mediaPreview}>
                  <PropertyMedia
                    media={item}
                    label={`PROPERTY IMAGE ${index + 1}`}
                    sizes="(max-width: 480px) 92vw, (max-width: 960px) 35vw, 20rem"
                  />
                  <span>Position {index + 1}</span>
                </div>
                <div className={styles.mediaFields}>
                  <label>
                    <span>Image storage reference</span>
                    <input
                      value={item.url}
                      maxLength={2048}
                      readOnly
                      aria-invalid={Boolean(urlError)}
                      aria-describedby={urlError ? urlErrorId : undefined}
                    />
                    {urlError ? <small id={urlErrorId}>{urlError}</small> : null}
                  </label>
                  <label>
                    <span>Alternative text</span>
                    <input
                      value={item.alt}
                      maxLength={240}
                      aria-invalid={Boolean(altError)}
                      aria-describedby={altError ? altErrorId : undefined}
                      onChange={(event) =>
                        updateItem(index, { alt: event.target.value })
                      }
                    />
                    {altError ? <small id={altErrorId}>{altError}</small> : null}
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
                  <fieldset className={styles.focalPoint}>
                    <legend>Card focal point</legend>
                    <label>
                      <span>Horizontal {Math.round(item.focalPoint?.x ?? 50)}%</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={item.focalPoint?.x ?? 50}
                        onChange={(event) =>
                          updateItem(index, {
                            focalPoint: {
                              x: Number(event.target.value),
                              y: item.focalPoint?.y ?? 50,
                            },
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>Vertical {Math.round(item.focalPoint?.y ?? 50)}%</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={item.focalPoint?.y ?? 50}
                        onChange={(event) =>
                          updateItem(index, {
                            focalPoint: {
                              x: item.focalPoint?.x ?? 50,
                              y: Number(event.target.value),
                            },
                          })
                        }
                      />
                    </label>
                  </fieldset>
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
                      onChange={() => {
                        setCoverMediaId(item.id);
                        setState({ kind: "idle" });
                        setDirty(true);
                      }}
                    />
                    Cover image
                  </label>
                  <button
                    type="button"
                    disabled={index === 0}
                    aria-label={`Move image ${index + 1} earlier`}
                    data-move-direction="earlier"
                    onClick={() => move(index, -1)}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    disabled={index === media.length - 1}
                    aria-label={`Move image ${index + 1} later`}
                    data-move-direction="later"
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
