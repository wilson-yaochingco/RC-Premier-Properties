"use client";

import { useState } from "react";

export function PropertyActions({
  propertyNumber,
  shareTitle,
}: {
  propertyNumber: string;
  shareTitle: string;
}) {
  const [message, setMessage] = useState("");

  function legacyCopy(value: string): boolean {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  }

  async function copy(value: string, success: string, failure: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else if (!legacyCopy(value)) {
        throw new Error("Clipboard unavailable");
      }
      setMessage(success);
    } catch {
      setMessage(failure);
    }
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url: window.location.href });
        setMessage("Share options opened.");
        return;
      }
      await copy(
        window.location.href,
        "Property link copied.",
        "Copy unavailable. Copy the link from your browser address bar.",
      );
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "Sharing canceled."
          : "Sharing is unavailable on this device.",
      );
    }
  }

  return (
    <div className="property-actions">
      <button
        type="button"
        onClick={() =>
          copy(
            propertyNumber,
            "Property number copied.",
            "Copy unavailable. Select and copy the property number shown on this page.",
          )
        }
      >
        Copy Property Number
      </button>
      <button type="button" onClick={share}>
        Share Property
      </button>
      <span role="status" aria-live="polite">
        {message}
      </span>
    </div>
  );
}
