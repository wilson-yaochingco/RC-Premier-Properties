"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicPropertyMedia } from "@rc/shared";
import { getDevelopmentSampleMedia } from "./development-sample-media";
import { PropertyMedia } from "./PropertyMedia";
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

export function PropertyGallery({
  coverMedia,
  gallery,
  propertyIdentifier,
}: {
  coverMedia?: PublicPropertyMedia;
  gallery: PublicPropertyMedia[];
  propertyIdentifier: string;
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
    if (candidates.length > 0) return assigned;
    const fallback = getDevelopmentSampleMedia(propertyIdentifier);
    return fallback ? [fallback] : [];
  }, [coverMedia, gallery, propertyIdentifier]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const touchStart = useRef<number | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const selected = media[selectedIndex] ?? media[0];
  const sourceUrl = selected ? safeSourceUrl(selected) : undefined;

  const select = useCallback(
    (index: number) => {
      const length = media.length;
      if (length > 0) setSelectedIndex((index + length) % length);
    },
    [media.length],
  );

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setFullscreen(false);
      if (event.key === "ArrowLeft") select(selectedIndex - 1);
      if (event.key === "ArrowRight") select(selectedIndex + 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreen, selectedIndex, media.length, select]);

  if (media.length === 0) {
    return (
      <section className={styles.gallery} aria-label="Property gallery">
        <div className={styles.galleryMain}>
          <PropertyMedia label="PROPERTY GALLERY IMAGE 01" preload />
        </div>
      </section>
    );
  }

  return (
    <section className={styles.gallery} aria-label="Property gallery">
      <figure className={styles.galleryMain}>
        <PropertyMedia
          media={selected}
          label="PROPERTY GALLERY IMAGE"
          preload
          sizes="(max-width: 768px) 100vw, 72vw"
        />
        <button
          type="button"
          className={styles.fullscreenTrigger}
          onClick={() => setFullscreen(true)}
        >
          View Fullscreen
        </button>
        <span className={styles.photoCount}>
          {selectedIndex + 1} / {media.length}
        </span>
        {selected?.caption || selected?.attribution ? (
          <figcaption className={styles.galleryCaption}>
            {selected.caption ? <span>{selected.caption}</span> : null}
            {selected.attribution ? (
              sourceUrl ? (
                <a href={sourceUrl} target="_blank" rel="noreferrer">
                  {selected.attribution}
                </a>
              ) : (
                <span>{selected.attribution}</span>
              )
            ) : null}
          </figcaption>
        ) : null}
      </figure>

      {media.length > 1 ? (
        <div className={styles.gallerySide} aria-label="Choose gallery image">
          {media.slice(0, 2).map((item, index) => (
            <button
              key={mediaKey(item, index)}
              type="button"
              className={styles.galleryChoice}
              aria-label={`Show image ${index + 1}: ${item.alt}`}
              aria-pressed={selectedIndex === index}
              onClick={() => select(index)}
            >
              <PropertyMedia media={item} sizes="28vw" />
            </button>
          ))}
        </div>
      ) : null}

      {media.length > 2 ? (
        <div className={styles.galleryRail} aria-label="All property images">
          {media.map((item, index) => (
            <button
              key={mediaKey(item, index)}
              type="button"
              className={styles.galleryThumbnail}
              aria-label={`Show image ${index + 1}: ${item.alt}`}
              aria-pressed={selectedIndex === index}
              onClick={() => select(index)}
            >
              <PropertyMedia media={item} sizes="10rem" />
            </button>
          ))}
        </div>
      ) : null}

      {fullscreen && selected ? (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Property photo viewer"
          onTouchStart={(event) => {
            touchStart.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const end = event.changedTouches[0]?.clientX;
            if (touchStart.current === null || end === undefined) return;
            const delta = end - touchStart.current;
            if (Math.abs(delta) > 45) select(selectedIndex + (delta < 0 ? 1 : -1));
            touchStart.current = null;
          }}
        >
          <button
            ref={closeButton}
            type="button"
            className={styles.lightboxClose}
            onClick={() => setFullscreen(false)}
          >
            Close
          </button>
          {media.length > 1 ? (
            <>
              <button
                type="button"
                className={styles.lightboxPrevious}
                onClick={() => select(selectedIndex - 1)}
                aria-label="Previous photo"
              >
                ←
              </button>
              <button
                type="button"
                className={styles.lightboxNext}
                onClick={() => select(selectedIndex + 1)}
                aria-label="Next photo"
              >
                →
              </button>
            </>
          ) : null}
          <div className={styles.lightboxMedia}>
            <PropertyMedia media={selected} fit="contain" sizes="100vw" />
          </div>
          <p>
            {selectedIndex + 1} / {media.length}
          </p>
        </div>
      ) : null}
    </section>
  );
}
