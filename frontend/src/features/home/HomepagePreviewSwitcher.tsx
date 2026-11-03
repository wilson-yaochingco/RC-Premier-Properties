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
  label: string;
  param: string;
  options: Array<{ label: string; value: string | null }>;
}

const ROWS: Row[] = [
  {
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
      aria-label="Homepage preview (development only)"
    >
      <span className={styles.title}>Preview</span>
      {ROWS.map(({ label, param, options }) => {
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
