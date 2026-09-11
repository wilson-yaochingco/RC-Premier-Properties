"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./about-experience.module.css";

const START_TIME_SECONDS = 4;

function seekToOpening(video: HTMLVideoElement) {
  if (Number.isFinite(video.duration) && video.duration > START_TIME_SECONDS + 0.5) {
    video.currentTime = START_TIME_SECONDS;
  }
}

export function AboutHeroVideo({ poster }: { poster: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) videoRef.current?.pause();
      else void videoRef.current?.play().catch(() => undefined);
    };

    syncPreference();
    preference.addEventListener("change", syncPreference);
    return () => preference.removeEventListener("change", syncPreference);
  }, []);

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
        onLoadedMetadata={(event) => seekToOpening(event.currentTarget)}
        onCanPlay={(event) => {
          seekToOpening(event.currentTarget);
          if (!reducedMotion) void event.currentTarget.play().catch(() => undefined);
        }}
        onTimeUpdate={(event) => {
          if (event.currentTarget.currentTime < START_TIME_SECONDS - 0.5) {
            seekToOpening(event.currentTarget);
          }
        }}
      />
    </div>
  );
}
