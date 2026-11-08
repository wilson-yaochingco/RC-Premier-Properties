"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePageScrollLock } from "@/hooks/usePageScrollLock";
import type { PublicPropertyMedia } from "@rc/shared";
import { getDevelopmentSampleMedia } from "./development-sample-media";
import {
  useRequestTour,
  type TourPropertyContext,
} from "@/features/inquiries/RequestTourProvider";
import { RollLabel } from "@/components/ui/RollLabel";
import { ArrowLeftIcon, PhotosIcon } from "./PropertyIcons";
import { PropertyMedia } from "./PropertyMedia";
import { ShareButton } from "./ShareButton";
import { orderPropertyPhotos } from "./property-photography";
import styles from "./property-detail.module.css";

function mediaKey(media: PublicPropertyMedia, index: number): string {
  return media.id ?? media.url ?? `legacy-media-${index}`;
}

function safeSourceUrl(media: PublicPropertyMedia): string | undefined {
  if (media.source !== "development-sample" || !media.sourceUrl) return undefined;
  try {
    const url = new URL(media.sourceUrl);
    return url.protocol === "https:" && url.hostname === "unsplash.com"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

/** The modal's contact action: closes the gallery first, then opens the viewing request. */
function BookViewing({
  property,
  onBook,
}: {
  property: TourPropertyContext;
  /** Closes the gallery and returns the control that opened it. */
  onBook: () => HTMLElement | null;
}) {
  const { openTour } = useRequestTour();
  return (
    <button
      type="button"
      className={`${styles.lightboxBook} cta`}
      onClick={() => openTour(property, onBook())}
    >
      <RollLabel>Book a Viewing</RollLabel>
    </button>
  );
}

/**
 * Desktop: one lead photograph and four supporting tiles of one shared proportion; tablet
 * and phone: the same list becomes a native scroll-snap carousel. Every photo, and the
 * "View all" control, opens a modal gallery: two large columns for browsing, with no zoom.
 * The modal is a dialog, so the page behind it is inert and the scroll is locked; Escape,
 * the Close control or a click on the backdrop closes it and focus returns to the opener.
 */
export function PropertyGallery({
  coverMedia,
  gallery,
  propertyIdentifier,
  title,
  share,
  tour,
}: {
  coverMedia?: PublicPropertyMedia;
  gallery: PublicPropertyMedia[];
  propertyIdentifier: string;
  title: string;
  /** Public pages offer Share and Book a Viewing in the modal; the admin preview does not. */
  share?: { title: string; url: string };
  tour?: TourPropertyContext;
}) {
  const media = useMemo(() => {
    const candidates = coverMedia ? [coverMedia, ...gallery] : gallery;
    const assigned = candidates.filter(
      (item, index, items) =>
        item.kind === "image" &&
        items.findIndex(
          (candidate) =>
            (item.id && candidate.id === item.id) ||
            (!item.id && item.url && candidate.url === item.url),
        ) === index,
    );
    if (candidates.length > 0) return orderPropertyPhotos(assigned);
    const fallback = getDevelopmentSampleMedia(propertyIdentifier);
    return fallback ? [fallback] : [];
  }, [coverMedia, gallery, propertyIdentifier]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  usePageScrollLock(open);
  const returnFocus = useRef<HTMLElement | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const track = useRef<HTMLDivElement>(null);

  const openGallery = useCallback((index: number, trigger: HTMLElement) => {
    returnFocus.current = trigger;
    setStartIndex(index);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => returnFocus.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element?.showModal();
    closeButton.current?.focus({ preventScroll: true });
    element
      ?.querySelector<HTMLElement>(`[data-photo-index="${startIndex}"]`)
      ?.scrollIntoView({ block: "start" });
    return () => element?.close();
    // The starting photo only matters on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      const first = controls.at(0);
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  function onTrackScroll() {
    const element = track.current;
    if (!element || element.clientWidth === 0) return;
    const slide = element.firstElementChild as HTMLElement | null;
    const step = slide
      ? slide.getBoundingClientRect().width +
        Number.parseFloat(getComputedStyle(element).columnGap || "0")
      : element.clientWidth;
    setSlideIndex(Math.min(media.length - 1, Math.round(element.scrollLeft / step)));
  }

  if (media.length === 0) {
    return (
      <section className={styles.gallery} aria-label="Property gallery">
        <div className={styles.galleryEmpty}>
          <PropertyMedia label="PROPERTY GALLERY IMAGE 01" preload />
        </div>
      </section>
    );
  }

  const shown = Math.min(media.length, 5);
  const countLabel = `${media.length} ${media.length === 1 ? "photo" : "photos"}`;

  return (
    <section className={styles.gallery} aria-label="Property gallery">
      {/* One ordered list feeds the mosaic, the swipe track and the overlay. */}
      <div
        ref={track}
        className={styles.track}
        data-count={shown}
        data-gallery-track
        onScroll={onTrackScroll}
        role="group"
        aria-label="Property photos"
      >
        {media.map((item, index) => (
          <button
            key={mediaKey(item, index)}
            type="button"
            className={styles.tile}
            aria-label={`Open photo ${index + 1} of ${media.length}: ${item.alt}`}
            onClick={(event) => openGallery(index, event.currentTarget)}
          >
            <PropertyMedia
              media={item}
              fit="cover"
              preload={index === 0}
              sizes={
                index === 0
                  ? "(min-width: 64rem) 50vw, 100vw"
                  : "(min-width: 64rem) 25vw, 100vw"
              }
            />
          </button>
        ))}
      </div>
      {media.length > 1 ? (
        <span className={styles.slideCount} aria-hidden="true">
          {slideIndex + 1} / {media.length}
        </span>
      ) : null}

      <button
        type="button"
        className={styles.viewAll}
        onClick={(event) => openGallery(0, event.currentTarget)}
      >
        <PhotosIcon />
        {countLabel}
      </button>

      {open
        ? createPortal(
            <dialog
              ref={dialog}
              className={styles.lightbox}
              role="dialog"
              aria-modal="true"
              aria-label="Property photo gallery"
              onCancel={(event) => {
                event.preventDefault();
                close();
              }}
              onClick={(event) => {
                if (event.target === event.currentTarget) close();
              }}
              data-lenis-prevent
            >
              <div className={styles.lightboxBar}>
                <button
                  ref={closeButton}
                  type="button"
                  className={styles.lightboxClose}
                  onClick={close}
                >
                  <ArrowLeftIcon />
                  <span className="link-underline">Back</span>
                </button>
                <p className={styles.lightboxTitle}>{title}</p>
                <div className={styles.lightboxActions}>
                  {share ? (
                    <ShareButton shareTitle={share.title} shareUrl={share.url} />
                  ) : null}
                  {tour ? (
                    <BookViewing
                      property={tour}
                      onBook={() => {
                        close();
                        return returnFocus.current;
                      }}
                    />
                  ) : null}
                </div>
              </div>
              <div
                className={styles.lightboxBody}
                tabIndex={0}
                role="region"
                aria-label={`All ${countLabel}`}
              >
                <ul className={styles.lightboxGrid}>
                  {media.map((item, index) => {
                    const sourceUrl = safeSourceUrl(item);
                    return (
                      <li
                        key={mediaKey(item, index)}
                        className={styles.lightboxItem}
                        data-photo-index={index}
                      >
                        <PropertyMedia
                          media={item}
                          fit="cover"
                          sizes="(min-width: 64rem) 560px, (min-width: 48rem) 45vw, 92vw"
                        />
                        {item.attribution ? (
                          <p className={styles.lightboxCredit}>
                            {sourceUrl ? (
                              <a href={sourceUrl} target="_blank" rel="noreferrer">
                                {item.attribution}
                              </a>
                            ) : (
                              item.attribution
                            )}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </dialog>,
            document.body,
          )
        : null}
    </section>
  );
}
