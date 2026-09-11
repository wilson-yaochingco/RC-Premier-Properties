"use client";

import Link from "next/link";
import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import {
  ADMIN_PROPERTY_CONTENT_FIELDS,
  ADMIN_LISTING_PURPOSES,
  PROPERTY_TYPE_LABELS,
  PUBLIC_PROPERTY_AREAS,
  RESIDENTIAL_SALE_PROPERTY_TYPES,
  PUBLIC_LOCATION_PRECISIONS,
  type AdminPropertyContentInput,
  type AdminPropertyCoordinates,
  type AdminPropertyDetail,
  type CreateDraftPropertyRequest,
  type PropertyType,
  type UpdateDraftPropertyRequest,
  type ValidationIssue,
} from "@rc/shared";
import { ApiClientError } from "@/services/api-client";
import {
  createDraftProperty,
  getAdminProperty,
  updateDraftProperty,
} from "./admin.service";
import { useAdminSession } from "./AdminShell";
import { AdminPropertyMediaManager } from "./AdminPropertyMediaManager";
import styles from "./admin.module.css";

interface AdminPropertyFormProps {
  mode: "create" | "edit";
  propertyId?: string;
}

interface SubmissionState {
  kind: "idle" | "pending" | "success" | "error";
  message?: string;
  issues?: ValidationIssue[];
  property?: AdminPropertyDetail;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; property?: AdminPropertyDetail }
  | { kind: "forbidden" }
  | { kind: "missing" }
  | { kind: "error"; message: string };

const EMPTY_CONTENT: AdminPropertyContentInput = {
  propertyId: "",
  slug: "",
  title: "",
  purpose: "sale",
  propertyType: "house-and-lot",
  featured: false,
  price: { amount: 0, negotiable: false },
  location: {
    province: "Pampanga",
    city: "Angeles City",
    publicPrecision: "city-only",
  },
  specifications: {},
  shortDescription: "",
  description: "",
  highlights: [],
  amenities: [],
  features: [],
};

const PURPOSE_LABELS = { sale: "For sale" } as const;
const PRECISION_LABELS = {
  exact: "Exact (approved only)",
  approximate: "Approximate",
  subdivision: "Subdivision",
  "barangay-area": "Barangay area",
  "city-only": "City only",
} as const;

function editableContent(property: AdminPropertyDetail): AdminPropertyContentInput {
  if (property.purpose !== "sale") {
    throw new Error(
      "Non-sale records cannot be edited in the sales administration UI.",
    );
  }
  return {
    propertyId: property.propertyId,
    slug: property.slug,
    title: property.title,
    purpose: property.purpose,
    propertyType: property.propertyType,
    featured: property.featured,
    price: {
      amount: property.price.amount,
      negotiable: property.price.negotiable,
    },
    location: property.location,
    specifications: property.specifications,
    shortDescription: property.shortDescription,
    description: property.description,
    highlights: property.highlights,
    amenities: property.amenities,
    features: property.features,
  };
}

function textValue(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function requiredNumber(data: FormData, name: string): number {
  return Number(textValue(data, name));
}

function optionalNumber(data: FormData, name: string): number | undefined {
  const value = textValue(data, name);
  return value === "" ? undefined : Number(value);
}

function coordinatePair(
  data: FormData,
  latitudeName: string,
  longitudeName: string,
): AdminPropertyCoordinates | undefined {
  const latitude = textValue(data, latitudeName);
  const longitude = textValue(data, longitudeName);
  if (!latitude && !longitude) return undefined;
  return {
    latitude: latitude ? Number(latitude) : Number.NaN,
    longitude: longitude ? Number(longitude) : Number.NaN,
  };
}

function requireCoordinatePair(
  form: HTMLFormElement | null,
  latitudeName: string,
  longitudeName: string,
) {
  if (!form) return;
  const latitude = form.elements.namedItem(latitudeName);
  const longitude = form.elements.namedItem(longitudeName);
  if (!(latitude instanceof HTMLInputElement)) return;
  if (!(longitude instanceof HTMLInputElement)) return;
  const hasEither = Boolean(latitude.value.trim() || longitude.value.trim());
  latitude.required = hasEither;
  longitude.required = hasEither;
}

function lines(data: FormData, name: string): string[] {
  return textValue(data, name)
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function contentFromForm(form: HTMLFormElement): CreateDraftPropertyRequest {
  const data = new FormData(form);
  const barangay = textValue(data, "barangay");
  const development = textValue(data, "development");
  const privateAddress = textValue(data, "privateAddress");
  const coordinates = coordinatePair(data, "privateLatitude", "privateLongitude");
  const publicCoordinates = coordinatePair(data, "publicLatitude", "publicLongitude");
  const furnishing = textValue(data, "furnishing");
  const specifications = {
    bedrooms: optionalNumber(data, "bedrooms"),
    bathrooms: optionalNumber(data, "bathrooms"),
    parkingSpaces: optionalNumber(data, "parkingSpaces"),
    lotAreaSqm: optionalNumber(data, "lotAreaSqm"),
    floorAreaSqm: optionalNumber(data, "floorAreaSqm"),
    storeys: optionalNumber(data, "storeys"),
    ...(furnishing ? { furnishing } : {}),
  };
  return {
    propertyId: textValue(data, "propertyId"),
    slug: textValue(data, "slug"),
    title: textValue(data, "title"),
    purpose: textValue(data, "purpose") as CreateDraftPropertyRequest["purpose"],
    propertyType: textValue(
      data,
      "propertyType",
    ) as CreateDraftPropertyRequest["propertyType"],
    featured: ["on", "true"].includes(String(data.get("featured") ?? "")),
    price: {
      amount: requiredNumber(data, "priceAmount"),
      negotiable: data.get("negotiable") === "on",
    },
    location: {
      province: textValue(data, "province"),
      city: textValue(data, "city"),
      ...(barangay ? { barangay } : {}),
      ...(development ? { development } : {}),
      publicPrecision: textValue(
        data,
        "publicPrecision",
      ) as CreateDraftPropertyRequest["location"]["publicPrecision"],
      ...(privateAddress ? { privateAddress } : {}),
      ...(coordinates ? { coordinates } : {}),
      ...(publicCoordinates
        ? {
            publicPoint: {
              type: "Point",
              coordinates: [publicCoordinates.longitude, publicCoordinates.latitude],
            },
          }
        : {}),
    },
    specifications: Object.fromEntries(
      Object.entries(specifications).filter(([, value]) => value !== undefined),
    ),
    shortDescription: textValue(data, "shortDescription"),
    description: textValue(data, "description"),
    highlights: lines(data, "highlights"),
    amenities: lines(data, "amenities"),
    features: lines(data, "features"),
  };
}

function changedContent(
  before: AdminPropertyContentInput,
  after: AdminPropertyContentInput,
): Omit<UpdateDraftPropertyRequest, "expectedVersion"> {
  return Object.fromEntries(
    ADMIN_PROPERTY_CONTENT_FIELDS.filter(
      (field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]),
    ).map((field) => [field, after[field]]),
  ) as Omit<UpdateDraftPropertyRequest, "expectedVersion">;
}

function Field({
  children,
  field,
  label,
  issues,
  wide = false,
}: {
  children: ReactElement<{
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }>;
  field: string;
  label: string;
  issues: ValidationIssue[];
  wide?: boolean;
}) {
  const issue = issues.find((candidate) => candidate.field === field);
  const errorId = `${field.replaceAll(".", "-")}-error`;
  return (
    <div className={`${styles.field} ${wide ? styles.wide : ""}`}>
      <label htmlFor={field}>{label}</label>
      {cloneElement(children, {
        ...(issue
          ? { "aria-describedby": errorId, "aria-invalid": true }
          : { "aria-invalid": false }),
      })}
      {issue ? (
        <p id={errorId} className={styles.fieldError}>
          {issue.message}
        </p>
      ) : null}
    </div>
  );
}

function TextList({
  content,
  field,
  label,
  issues,
}: {
  content: string[];
  field: "highlights" | "amenities" | "features";
  label: string;
  issues: ValidationIssue[];
}) {
  return (
    <Field field={field} label={`${label} (one per line)`} issues={issues} wide>
      <textarea id={field} name={field} defaultValue={content.join("\n")} rows={4} />
    </Field>
  );
}

export function AdminPropertyForm({ mode, propertyId }: AdminPropertyFormProps) {
  const { session, expireSession } = useAdminSession();
  const [load, setLoad] = useState<LoadState>(
    mode === "edit" ? { kind: "loading" } : { kind: "ready" },
  );
  const [submission, setSubmission] = useState<SubmissionState>({ kind: "idle" });
  const [attempt, setAttempt] = useState(0);
  const [dirty, setDirty] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "edit" || !propertyId) return;
    const controller = new AbortController();
    getAdminProperty(propertyId, controller.signal)
      .then((property) => setLoad({ kind: "ready", property }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiClientError && error.statusCode === 401) {
          expireSession();
          return;
        }
        if (error instanceof ApiClientError && error.statusCode === 403) {
          setLoad({ kind: "forbidden" });
          return;
        }
        if (error instanceof ApiClientError && error.statusCode === 404) {
          setLoad({ kind: "missing" });
          return;
        }
        setLoad({
          kind: "error",
          message:
            error instanceof ApiClientError
              ? error.message
              : "The property draft could not be loaded.",
        });
      });
    return () => controller.abort();
  }, [attempt, expireSession, mode, propertyId]);

  useEffect(() => {
    if (submission.kind === "error") errorRef.current?.focus();
  }, [submission]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const beforeLink = (event: MouseEvent) => {
      const link =
        event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (link && !window.confirm("Leave without saving your property changes?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeLink, true);
    };
  }, [dirty]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = contentFromForm(event.currentTarget);
    const changed =
      mode === "edit" && load.kind === "ready" && load.property
        ? changedContent(editableContent(load.property), content)
        : content;
    if (mode === "edit" && Object.keys(changed).length === 0) {
      setSubmission({
        kind: "error",
        message: "No content fields have changed.",
        issues: [
          { field: "body", message: "Change at least one field before saving." },
        ],
      });
      return;
    }

    setSubmission({ kind: "pending" });
    const expectedVersion = load.kind === "ready" ? load.property?.version : undefined;
    try {
      const property =
        mode === "create"
          ? await createDraftProperty(
              changed as CreateDraftPropertyRequest,
              session.csrfToken,
            )
          : await updateDraftProperty(
              propertyId ?? "",
              {
                ...(changed as Omit<UpdateDraftPropertyRequest, "expectedVersion">),
                expectedVersion: expectedVersion ?? -1,
              },
              session.csrfToken,
            );
      if (mode === "edit") setLoad({ kind: "ready", property });
      setDirty(false);
      setSubmission({
        kind: "success",
        message:
          mode === "create" ? "Draft property created." : "Property changes saved.",
        property,
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.statusCode === 401) {
        expireSession();
        return;
      }
      setSubmission({
        kind: "error",
        message:
          error instanceof ApiClientError
            ? error.message
            : "The draft could not be saved.",
        issues: error instanceof ApiClientError ? error.response.issues : undefined,
      });
    }
  }

  if (load.kind === "loading") {
    return (
      <div className={styles.panel} aria-busy="true">
        Loading draft…
      </div>
    );
  }
  if (load.kind === "forbidden") {
    return (
      <div className={styles.panel} role="alert">
        You do not have permission to edit properties.
      </div>
    );
  }
  if (load.kind === "missing") {
    return (
      <div className={styles.panel} role="alert">
        This draft was not found or is no longer editable.
      </div>
    );
  }
  if (load.kind === "error") {
    return (
      <div className={styles.panel} role="alert">
        <p>{load.message}</p>
        <button
          type="button"
          onClick={() => {
            setLoad({ kind: "loading" });
            setAttempt((value) => value + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (
    mode === "edit" &&
    load.property &&
    !["draft", "unpublished"].includes(load.property.publicationStatus)
  ) {
    return (
      <section className={styles.page}>
        <div className={styles.panel} role="alert">
          <h1>This property is not editable.</h1>
          <p>Unpublish or restore it before changing listing content.</p>
          <Link href={`/admin/properties/${load.property.id}/preview`}>
            Preview property
          </Link>
          <Link href="/admin/properties">Back to properties</Link>
        </div>
      </section>
    );
  }

  if (mode === "edit" && load.property && load.property.purpose !== "sale") {
    return (
      <section className={styles.page}>
        <div className={styles.panel} role="alert">
          <h1>This legacy non-sale record is read-only.</h1>
          <p>
            The production administration workflow is sales-only. Review this record
            through the integrity report and reconcile it deliberately outside the
            public publishing workflow.
          </p>
          <Link href="/admin/properties">Back to properties</Link>
        </div>
      </section>
    );
  }

  if (
    mode === "edit" &&
    load.property &&
    !(RESIDENTIAL_SALE_PROPERTY_TYPES as readonly string[]).includes(
      load.property.propertyType,
    )
  ) {
    return (
      <section className={styles.page}>
        <div className={styles.panel} role="alert">
          <h1>This legacy non-residential record is read-only.</h1>
          <p>
            The production workflow accepts approved residential sale types only.
            Reconcile this historical record deliberately outside the public publishing
            workflow.
          </p>
          <Link href="/admin/properties">Back to properties</Link>
        </div>
      </section>
    );
  }

  const content = load.property ? editableContent(load.property) : EMPTY_CONTENT;
  const issues = submission.issues ?? [];

  return (
    <section className={styles.page} aria-labelledby="property-form-title">
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Property administration</p>
          <h1 id="property-form-title">
            {mode === "create"
              ? "Create a draft property"
              : `Editing PREMIER PROPERTY #${load.property?.propertyId ?? ""}`}
          </h1>
          <p>
            Save content here, then preview and manage lifecycle from the property list.
          </p>
        </div>
        <Link href="/admin/properties">Back to properties</Link>
      </div>

      {load.property ? (
        <div className={styles.lifecycleNotice}>
          <span>Publication: {load.property.publicationStatus}</span>
          <span>Availability: {load.property.availability}</span>
          <span>
            Publish readiness:{" "}
            {load.property.publicationReadiness.ready ? "Complete" : "Incomplete"}
          </span>
          {!load.property.publicationReadiness.ready ? (
            <span>
              Missing: {load.property.publicationReadiness.missing.join(", ")}
            </span>
          ) : null}
        </div>
      ) : (
        <div className={styles.lifecycleNotice}>
          New records are always created as private, available drafts. Complete all
          required listing, price, public location, and description fields before
          publishing.
        </div>
      )}

      {submission.kind === "error" ? (
        <div ref={errorRef} className={styles.errorSummary} role="alert" tabIndex={-1}>
          <strong>We could not save this draft.</strong>
          <p>{submission.message}</p>
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

      {submission.kind === "success" ? (
        <div className={styles.successMessage} role="status" tabIndex={-1}>
          <strong>{submission.message}</strong>
          {mode === "create" && submission.property ? (
            <Link href={`/admin/properties/${submission.property.id}/edit`}>
              Edit the new draft
            </Link>
          ) : null}
          {submission.property ? (
            <Link href={`/admin/properties/${submission.property.id}/preview`}>
              Preview property
            </Link>
          ) : null}
        </div>
      ) : null}

      <form
        key={load.property?.updatedAt ?? "new"}
        className={styles.form}
        onSubmit={handleSubmit}
        onChange={() => {
          setDirty(true);
          if (submission.kind === "success") setSubmission({ kind: "idle" });
        }}
      >
        <fieldset disabled={submission.kind === "pending"}>
          <legend>Listing identity</legend>
          <div className={styles.formGrid}>
            <Field field="propertyId" label="Property ID" issues={issues}>
              <input
                id="propertyId"
                name="propertyId"
                defaultValue={content.propertyId}
                maxLength={40}
                readOnly={mode === "edit"}
                required
              />
            </Field>
            <Field field="slug" label="URL slug" issues={issues}>
              <input
                id="slug"
                name="slug"
                defaultValue={content.slug}
                maxLength={160}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                readOnly={Boolean(load.property?.publishedAt)}
                required
              />
            </Field>
            <Field field="title" label="Title" issues={issues} wide>
              <input
                id="title"
                name="title"
                defaultValue={content.title}
                maxLength={180}
                required
              />
            </Field>
            <Field field="purpose" label="Purpose" issues={issues}>
              <select id="purpose" name="purpose" defaultValue={content.purpose}>
                {ADMIN_LISTING_PURPOSES.map((purpose) => (
                  <option key={purpose} value={purpose}>
                    {PURPOSE_LABELS[purpose]}
                  </option>
                ))}
              </select>
            </Field>
            <Field field="propertyType" label="Property type" issues={issues}>
              <select
                id="propertyType"
                name="propertyType"
                defaultValue={content.propertyType}
              >
                {RESIDENTIAL_SALE_PROPERTY_TYPES.map((type: PropertyType) => (
                  <option key={type} value={type}>
                    {PROPERTY_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </Field>
            <Field field="price.amount" label="Price (PHP)" issues={issues}>
              <input
                id="price.amount"
                name="priceAmount"
                type="number"
                min="0"
                max="1000000000000"
                step="0.01"
                defaultValue={content.price.amount}
                required
              />
            </Field>
            <label className={styles.checkbox}>
              <input
                name="negotiable"
                type="checkbox"
                defaultChecked={content.price.negotiable}
              />{" "}
              Price is negotiable
            </label>
            <input
              name="featured"
              type="hidden"
              value={content.featured ? "true" : "false"}
            />
          </div>
        </fieldset>

        <fieldset disabled={submission.kind === "pending"}>
          <legend>Location and disclosure</legend>
          <div className={styles.formGrid}>
            <p className={styles.locationNotice}>
              Province, city and any permitted area names can appear publicly according
              to the precision below. Private address and exact internal coordinates are
              available only to authorized staff.
            </p>
            <Field field="location.province" label="Province" issues={issues}>
              <input
                id="location.province"
                name="province"
                defaultValue={content.location.province}
                maxLength={100}
                required
              />
            </Field>
            <Field field="location.city" label="City / municipality" issues={issues}>
              <select
                id="location.city"
                name="city"
                defaultValue={content.location.city}
                required
              >
                {!PUBLIC_PROPERTY_AREAS.includes(
                  content.location.city as (typeof PUBLIC_PROPERTY_AREAS)[number],
                ) ? (
                  <option value={content.location.city}>
                    Legacy locality: {content.location.city}
                  </option>
                ) : null}
                {PUBLIC_PROPERTY_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              field="location.barangay"
              label="Barangay (optional)"
              issues={issues}
            >
              <input
                id="location.barangay"
                name="barangay"
                defaultValue={content.location.barangay}
                maxLength={100}
              />
            </Field>
            <Field
              field="location.development"
              label="Development (optional)"
              issues={issues}
            >
              <input
                id="location.development"
                name="development"
                defaultValue={content.location.development}
                maxLength={140}
              />
            </Field>
            <Field
              field="location.publicPrecision"
              label="Public precision"
              issues={issues}
              wide
            >
              <select
                id="location.publicPrecision"
                name="publicPrecision"
                defaultValue={content.location.publicPrecision}
              >
                {PUBLIC_LOCATION_PRECISIONS.map((precision) => (
                  <option key={precision} value={precision}>
                    {PRECISION_LABELS[precision]}
                  </option>
                ))}
              </select>
            </Field>
            <p className={styles.locationNotice}>
              Private location: store only verified operational information. These
              values are never copied into public responses or used to create a map pin.
            </p>
            <Field
              field="location.privateAddress"
              label="Private address (optional)"
              issues={issues}
              wide
            >
              <input
                id="location.privateAddress"
                name="privateAddress"
                defaultValue={content.location.privateAddress}
                maxLength={240}
                autoComplete="off"
              />
            </Field>
            <Field
              field="location.coordinates.latitude"
              label="Private exact latitude (optional)"
              issues={issues}
            >
              <input
                id="location.coordinates.latitude"
                name="privateLatitude"
                type="number"
                min="-90"
                max="90"
                step="any"
                defaultValue={content.location.coordinates?.latitude}
                onInput={(event) =>
                  requireCoordinatePair(
                    event.currentTarget.form,
                    "privateLatitude",
                    "privateLongitude",
                  )
                }
              />
            </Field>
            <Field
              field="location.coordinates.longitude"
              label="Private exact longitude (optional)"
              issues={issues}
            >
              <input
                id="location.coordinates.longitude"
                name="privateLongitude"
                type="number"
                min="-180"
                max="180"
                step="any"
                defaultValue={content.location.coordinates?.longitude}
                onInput={(event) =>
                  requireCoordinatePair(
                    event.currentTarget.form,
                    "privateLatitude",
                    "privateLongitude",
                  )
                }
              />
            </Field>
            <p className={styles.locationWarning}>
              Public map point: both values below are sent to public property APIs and
              maps with the selected precision. Enter a deliberately reviewed public
              point. Do not copy the private exact coordinates unless exact public
              disclosure has been explicitly approved.
            </p>
            <Field
              field="location.publicPoint.coordinates.1"
              label="Approved public latitude (optional)"
              issues={issues}
            >
              <input
                id="location.publicPoint.coordinates.1"
                name="publicLatitude"
                type="number"
                min="-90"
                max="90"
                step="any"
                defaultValue={content.location.publicPoint?.coordinates[1]}
                onInput={(event) =>
                  requireCoordinatePair(
                    event.currentTarget.form,
                    "publicLatitude",
                    "publicLongitude",
                  )
                }
              />
            </Field>
            <Field
              field="location.publicPoint.coordinates.0"
              label="Approved public longitude (optional)"
              issues={issues}
            >
              <input
                id="location.publicPoint.coordinates.0"
                name="publicLongitude"
                type="number"
                min="-180"
                max="180"
                step="any"
                defaultValue={content.location.publicPoint?.coordinates[0]}
                onInput={(event) =>
                  requireCoordinatePair(
                    event.currentTarget.form,
                    "publicLatitude",
                    "publicLongitude",
                  )
                }
              />
            </Field>
          </div>
        </fieldset>

        <fieldset disabled={submission.kind === "pending"}>
          <legend>Descriptions</legend>
          <div className={styles.formGrid}>
            <Field
              field="shortDescription"
              label="Short description"
              issues={issues}
              wide
            >
              <textarea
                id="shortDescription"
                name="shortDescription"
                defaultValue={content.shortDescription}
                maxLength={500}
                rows={3}
                required
              />
            </Field>
            <Field field="description" label="Full description" issues={issues} wide>
              <textarea
                id="description"
                name="description"
                defaultValue={content.description}
                maxLength={10000}
                rows={8}
                required
              />
            </Field>
            <TextList
              field="highlights"
              label="Highlights"
              content={content.highlights}
              issues={issues}
            />
            <TextList
              field="amenities"
              label="Amenities"
              content={content.amenities}
              issues={issues}
            />
            <TextList
              field="features"
              label="Features"
              content={content.features}
              issues={issues}
            />
          </div>
        </fieldset>

        <fieldset disabled={submission.kind === "pending"}>
          <legend>Specifications</legend>
          <div className={styles.formGrid}>
            {(["bedrooms", "bathrooms", "parkingSpaces", "storeys"] as const).map(
              (field) => (
                <Field
                  key={field}
                  field={`specifications.${field}`}
                  label={field.replace(/([A-Z])/g, " $1")}
                  issues={issues}
                >
                  <input
                    id={`specifications.${field}`}
                    name={field}
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    defaultValue={content.specifications[field]}
                  />
                </Field>
              ),
            )}
            {(["lotAreaSqm", "floorAreaSqm"] as const).map((field) => (
              <Field
                key={field}
                field={`specifications.${field}`}
                label={field === "lotAreaSqm" ? "Lot area (sqm)" : "Floor area (sqm)"}
                issues={issues}
              >
                <input
                  id={`specifications.${field}`}
                  name={field}
                  type="number"
                  min="0"
                  max="100000000"
                  step="0.01"
                  defaultValue={content.specifications[field]}
                />
              </Field>
            ))}
            <Field
              field="specifications.furnishing"
              label="Furnishing (optional)"
              issues={issues}
              wide
            >
              <input
                id="specifications.furnishing"
                name="furnishing"
                defaultValue={content.specifications.furnishing}
                maxLength={100}
              />
            </Field>
          </div>
        </fieldset>

        <button
          className={styles.submit}
          type="submit"
          disabled={submission.kind === "pending"}
        >
          {submission.kind === "pending"
            ? "Saving…"
            : mode === "create"
              ? "Create private draft"
              : "Save property content"}
        </button>
      </form>
      {load.property ? (
        <AdminPropertyMediaManager
          property={load.property}
          onSaved={(property) => setLoad({ kind: "ready", property })}
        />
      ) : (
        <div className={styles.panel}>
          <h2>Property media</h2>
          <p>Create the private draft first, then add and arrange its images.</p>
        </div>
      )}
    </section>
  );
}
