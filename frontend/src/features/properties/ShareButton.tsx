"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShareIcon } from "./PropertyIcons";

const STATUS_VISIBLE_MS = 3000;

/**
 * Shares the canonical property URL: the native sheet where available, else copies it.
 * Nothing is drawn as page content after the share sheet closes or is cancelled. A copied
 * link is confirmed by the button's own label for a moment; every outcome is also announced
 * through a visually hidden live region that is cleared with it.
 */
export function ShareButton({
  shareTitle,
  shareUrl,
}: {
  shareTitle: string;
  shareUrl: string;
}) {
  const [announcement, setAnnouncement] = useState("");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const reset = useCallback(() => {
    clearTimeout(timer.current);
    setAnnouncement("");
    setCopied(false);
  }, []);

  // A status must not outlive the control that produced it.
  useEffect(() => () => clearTimeout(timer.current), []);

  function report(message: string, showCopied = false) {
    clearTimeout(timer.current);
    setAnnouncement(message);
    setCopied(showCopied);
    timer.current = setTimeout(reset, STATUS_VISIBLE_MS);
  }

  function legacyCopy(value: string): boolean {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    try {
      return document.execCommand("copy");
    } finally {
      field.remove();
      previousFocus?.focus();
    }
  }

  async function copyLink() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else if (!legacyCopy(shareUrl)) {
        throw new Error("Clipboard unavailable");
      }
      report("Property link copied.", true);
    } catch {
      report("Copy unavailable. Copy the link from your browser address bar.");
    }
  }

  async function share() {
    reset();
    try {
      if (navigator.share) {
        // The system sheet is its own confirmation, so success and cancellation say nothing.
        await navigator.share({ title: shareTitle, url: shareUrl });
        return;
      }
      await copyLink();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      report("Sharing is unavailable on this device.");
    }
  }

  return (
    <span className="share">
      <button
        type="button"
        className="share__button"
        onClick={share}
        aria-label={copied ? undefined : "Share property"}
      >
        <ShareIcon />
        <span className="link-underline">{copied ? "Link copied" : "Share"}</span>
      </button>
      <span role="status" aria-live="polite" className="visually-hidden">
        {announcement}
      </span>
    </span>
  );
}
