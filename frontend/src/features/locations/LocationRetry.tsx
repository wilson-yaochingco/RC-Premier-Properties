"use client";

import { useRouter } from "next/navigation";
import { RollLabel } from "@/components/ui/RollLabel";
import styles from "./locations-index.module.css";

/** Re-requests the server-rendered page after an unavailable inventory response. */
export function LocationRetry() {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`${styles.primaryAction} cta`}
      onClick={() => router.refresh()}
    >
      <RollLabel>Try again</RollLabel>
      <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </button>
  );
}
