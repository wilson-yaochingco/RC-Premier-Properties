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

  async function copy(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(success);
    } catch {
      setMessage("Copy failed. Please copy it from the page address.");
    }
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url: window.location.href });
        setMessage("Share options opened.");
        return;
      }
      await copy(window.location.href, "Property link copied.");
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
        onClick={() => copy(propertyNumber, "Property number copied.")}
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
