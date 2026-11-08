"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { RcPremierMark } from "../../components/layout/RcPremierMark";
import type { TourVideo } from "./property-tours";
import styles from "./property-tours.module.css";

const INITIAL_COUNT = 3;

/**
 * Poster-first gallery: each Short shows YouTube's own portrait thumbnail with its real title
 * until played, and only the clicked Short ever creates an iframe. Thumbnails load lazily.
 */
export function PropertyTours({ videos }: { videos: TourVideo[] }) {
  const [expanded, setExpanded] = useState(false);
  const [playingId, setPlayingId] = useState<string>();
  // Some Shorts have no `oardefault` still; their portrait frame is `oar2`.
  const [altThumbnail, setAltThumbnail] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (playingId) document.getElementById(`property-tour-${playingId}`)?.focus();
  }, [playingId]);

  function toggle() {
    setExpanded((value) => !value);
    setPlayingId(undefined);
  }

  return (
    <div className={styles.gallery}>
      <ul className={styles.list} data-expanded={expanded} data-motion="group">
        {videos.map(({ id, title, channel }, index) => {
          const name = title ?? `RC Premier property tour ${index + 1}`;
          return (
            <li key={id} className={styles.card} data-extra={index >= INITIAL_COUNT}>
              <div className={styles.media}>
                {playingId === id ? (
                  <iframe
                    id={`property-tour-${id}`}
                    className={styles.player}
                    src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&controls=0&fs=0&playsinline=1&rel=0`}
                    title={name}
                    allow="autoplay; accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <button
                    type="button"
                    className={styles.poster}
                    aria-label={`Play ${name}`}
                    onClick={() => setPlayingId(id)}
                  >
                    <Image
                      src={`https://i.ytimg.com/vi/${id}/${altThumbnail.has(id) ? "oar2" : "oardefault"}.jpg`}
                      onLoad={(event) => {
                        // A missing still comes back as a 120x90 grey placeholder, not an error.
                        if (event.currentTarget.naturalWidth < 400) {
                          setAltThumbnail((ids) => new Set(ids).add(id));
                        }
                      }}
                      alt=""
                      fill
                      unoptimized
                      loading="lazy"
                      sizes="(max-width: 639px) 78vw, 330px"
                      className={styles.thumbnail}
                    />
                    {title ? (
                      <span className={styles.meta} aria-hidden="true">
                        <span className={styles.avatar}>
                          <RcPremierMark />
                        </span>
                        <span className={styles.metaText}>
                          <span className={styles.videoTitle}>{title}</span>
                          {channel ? (
                            <span className={styles.channel}>{channel}</span>
                          ) : null}
                        </span>
                      </span>
                    ) : null}
                    <span className={styles.play} aria-hidden="true">
                      <svg viewBox="0 0 16 16">
                        <path d="M5.5 3.5v9l7-4.5-7-4.5Z" fill="currentColor" />
                      </svg>
                    </span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className={styles.toggle}
        aria-expanded={expanded}
        aria-label={expanded ? "Show fewer property tours" : "Show more property tours"}
        onClick={toggle}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
          <path
            d={expanded ? "M3 8h10" : "M3 8h10M8 3v10"}
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </button>
    </div>
  );
}
