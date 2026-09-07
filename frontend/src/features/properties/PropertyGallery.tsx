"use client";

import { useMemo, useState } from "react";
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
    const assignedMedia = candidates.filter(
      (item, index, items) =>
        item.kind === "image" &&
        items.findIndex(
          (candidate) =>
            (item.id && candidate.id === item.id) ||
            (!item.id && item.url && candidate.url === item.url),
        ) === index,
    );

    if (candidates.length > 0) return assignedMedia;

    const fallback = getDevelopmentSampleMedia(propertyIdentifier);
    return fallback ? [fallback] : [];
  }, [coverMedia, gallery, propertyIdentifier]);
  const [selectedKey, setSelectedKey] = useState(() =>
    media[0] ? mediaKey(media[0], 0) : "",
  );
  const selectedIndex = Math.max(
    0,
    media.findIndex((item, index) => mediaKey(item, index) === selectedKey),
  );
  const selected = media[selectedIndex];
  const sourceUrl = selected ? safeSourceUrl(selected) : undefined;

  if (media.length === 0) {
    return (
      <section className={styles.gallery} aria-label="Property gallery">
        <div className={styles.galleryMain}>
          <PropertyMedia label="PROPERTY GALLERY IMAGE 01" preload />
        </div>
        <div className={styles.gallerySide} aria-hidden="true">
          <PropertyMedia label="PROPERTY GALLERY IMAGE 02" />
          <PropertyMedia label="PROPERTY GALLERY IMAGE 03" />
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
          {media.slice(0, 2).map((item, index) => {
            const key = mediaKey(item, index);
            return (
              <button
                key={key}
                type="button"
                className={styles.galleryChoice}
                aria-label={`Show image ${index + 1}: ${item.alt}`}
                aria-pressed={selectedKey === key}
                onClick={() => setSelectedKey(key)}
              >
                <PropertyMedia media={item} sizes="28vw" />
              </button>
            );
          })}
        </div>
      ) : null}

      {media.length > 2 ? (
        <div className={styles.galleryRail} aria-label="All property images">
          {media.map((item, index) => {
            const key = mediaKey(item, index);
            return (
              <button
                key={key}
                type="button"
                className={styles.galleryThumbnail}
                aria-label={`Show image ${index + 1}: ${item.alt}`}
                aria-pressed={selectedKey === key}
                onClick={() => setSelectedKey(key)}
              >
                <PropertyMedia media={item} sizes="10rem" />
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
