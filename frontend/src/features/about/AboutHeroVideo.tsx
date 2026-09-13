"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import styles from "./about-experience.module.css";

const START_TIME_SECONDS = 4;

function seekToOpening(video: HTMLVideoElement, hasSeeked: MutableRefObject<boolean>) {
  if (
    !hasSeeked.current &&
    video.readyState >= HTMLMediaElement.HAVE_METADATA &&
    Number.isFinite(video.duration) &&
    video.duration > START_TIME_SECONDS + 0.5
  ) {
    video.currentTime = START_TIME_SECONDS;
    hasSeeked.current = true;
  }
}

export function AboutHeroVideo({ poster }: { poster: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotionRef = useRef(true);
  const hasSeekedRef = useRef(false);
  const playRequestedRef = useRef(false);
  const previousTimeRef = useRef(START_TIME_SECONDS);
  const [reducedMotion, setReducedMotion] = useState(true);

  const startPlayback = useCallback((video: HTMLVideoElement) => {
    video.defaultMuted = true;
    video.muted = true;
    if (reducedMotionRef.current || playRequestedRef.current || !video.paused) return;

    playRequestedRef.current = true;
    void video.play().catch(() => {
      playRequestedRef.current = false;
    });
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => {
      const video = videoRef.current;
      reducedMotionRef.current = preference.matches;
      setReducedMotion(preference.matches);
      if (!video) return;

      video.defaultMuted = true;
      video.muted = true;
      if (preference.matches) {
        playRequestedRef.current = false;
        video.pause();
        return;
      }

      seekToOpening(video, hasSeekedRef);
      startPlayback(video);
    };

    syncPreference();
    preference.addEventListener("change", syncPreference);
    return () => preference.removeEventListener("change", syncPreference);
  }, [startPlayback]);

  return (
    <div className={styles.videoFrame} aria-hidden="true">
      <Image
        src={poster}
        alt=""
        fill
        priority
        sizes="100vw"
        className={styles.videoFallback}
      />
      <video
        ref={videoRef}
        className={styles.heroVideo}
        src="https://videos.ctfassets.net/3xf6g0o5qdho/1uc2E01DTu8ASyAKYoq4oK/40e19ac85c90529f143fec0f001b1cda/MV_About_Header_1080p_.mp4"
        poster={poster}
        muted
        autoPlay={!reducedMotion}
        loop
        playsInline
        preload="metadata"
        tabIndex={-1}
        data-start-time={START_TIME_SECONDS}
        data-reduced-motion={reducedMotion}
        onLoadedMetadata={(event) => {
          seekToOpening(event.currentTarget, hasSeekedRef);
          if (!reducedMotionRef.current) startPlayback(event.currentTarget);
        }}
        onCanPlay={(event) => {
          if (!reducedMotionRef.current) startPlayback(event.currentTarget);
        }}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          const currentTime = video.currentTime;
          if (
            hasSeekedRef.current &&
            previousTimeRef.current > START_TIME_SECONDS + 1 &&
            currentTime < 1
          ) {
            video.currentTime = START_TIME_SECONDS;
            previousTimeRef.current = START_TIME_SECONDS;
            return;
          }
          previousTimeRef.current = currentTime;
        }}
      />
    </div>
  );
}
