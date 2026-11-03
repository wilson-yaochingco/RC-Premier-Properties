"use client";

/**
 * DEVELOPMENT ONLY. One local UI-review toolbar for the homepage's fixture-driven sections.
 *
 * Rendered solely through the guarded dynamic import in `DevHomepagePreview`, so it never
 * reaches a production build. Each query parameter stays the source of truth for its own
 * section and changing one never touches the other.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./homepage-preview-switcher.module.css";

interface Row {
  path: string;
  label: string;
  param: string;
  options: Array<{ label: string; value: string | null }>;
}

const ROWS: Row[] = [
  {
    path: "/",
    label: "Featured",
    param: "featuredFixture",
    options: [
      { label: "Real", value: null },
      { label: "0", value: "empty" },
      { label: "1", value: "one" },
      { label: "2", value: "two" },
      { label: "3", value: "three" },
      { label: "Error", value: "unavailable" },
    ],
  },
  {
    path: "/",
    label: "Locations",
    param: "locationFixture",
    options: [
      { label: "Real", value: null },
      { label: "0", value: "empty" },
      { label: "1", value: "one" },
      { label: "2", value: "two" },
      { label: "4", value: "four" },
      { label: "Error", value: "unavailable" },
    ],
  },
  {
    path: "/properties",
    label: "Catalog",
    param: "catalogFixture",
    options: [
      { label: "Real", value: null },
      ...["0", "1", "2", "3", "4", "5", "6"].map((count) => ({
        label: count,
        value: count,
      })),
      { label: "Error", value: "unavailable" },
    ],
  },
  {
    path: "/book-viewing",
    label: "Listings",
    param: "viewingFixture",
    options: [
      { label: "Real", value: null },
      ...["0", "1", "2", "4", "6"].map((count) => ({ label: count, value: count })),
      { label: "Error", value: "unavailable" },
    ],
  },
  {
    path: "/book-viewing",
    label: "Property",
    param: "viewingPropertyFixture",
    options: [
      { label: "None", value: null },
      { label: "Available", value: "available" },
      { label: "Reserved", value: "reserved" },
      { label: "Sold", value: "sold" },
      { label: "Not found", value: "not-found" },
      { label: "Lookup error", value: "lookup-failed" },
    ],
  },
];

export function HomepagePreviewSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  function select(param: string, value: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(param, value);
    else next.delete(param);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div
      className={styles.switcher}
      role="group"
      aria-label="Preview (development only)"
    >
      <span className={styles.title}>Preview</span>
      {ROWS.filter((row) => row.path === pathname).map(({ label, param, options }) => {
        const current = searchParams.get(param);
        return (
          <div key={param} className={styles.row} role="group" aria-label={label}>
            <span className={styles.rowLabel}>{label}</span>
            {options.map((option) => (
              <button
                key={option.label}
                type="button"
                data-active={option.value === current || (!option.value && !current)}
                onClick={() => select(param, option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
