"use client";

import { useEffect, useRef, useState } from "react";

const videos = [
  {
    id: "8tGEOhF_o8M",
    url: "https://youtube.com/shorts/8tGEOhF_o8M?si=UQqAiJ90eS4-f0_Q",
  },
  {
    id: "w0WveEZTyU8",
    url: "https://youtube.com/shorts/w0WveEZTyU8?si=O4yeF1ejn7J4zmnR",
  },
  {
    id: "bZPY9DClb1o",
    url: "https://youtube.com/shorts/bZPY9DClb1o?si=5MNya_9Y_iw7XNlb",
  },
] as const;

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d={direction === "left" ? "m14.5 5-7 7 7 7" : "m9.5 5 7 7-7 7"}
        stroke="currentColor"
      />
    </svg>
  );
}

export function FeaturedVideos() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeVideo, setActiveVideo] = useState<string>();

  useEffect(() => {
    if (activeVideo) {
      document.getElementById(`featured-video-${activeVideo}`)?.focus();
    }
  }, [activeVideo]);

  function selectSlide(index: number) {
    const nextIndex = Math.max(0, Math.min(videos.length - 1, index));
    setActiveVideo(undefined);
    setCurrentIndex(nextIndex);

    const track = trackRef.current;
    if (!track) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({
      left: track.clientWidth * nextIndex,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  function syncCurrentSlide() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const nextIndex = Math.max(
      0,
      Math.min(videos.length - 1, Math.round(track.scrollLeft / track.clientWidth)),
    );
    if (nextIndex !== currentIndex) {
      setActiveVideo(undefined);
      setCurrentIndex(nextIndex);
    }
  }

  return (
    <div className="featured-videos" aria-label="Featured property video carousel">
      <div
        ref={trackRef}
        className="featured-videos__track"
        onScroll={syncCurrentSlide}
      >
        {videos.map((video, index) => {
          const isActive = activeVideo === video.id;
          return (
            <article
              key={video.id}
              className="featured-video"
              aria-label={`Featured property video ${index + 1} of ${videos.length}`}
              aria-hidden={currentIndex !== index}
              inert={currentIndex !== index}
            >
              <div className="featured-video__stage">
                {isActive ? (
                  <iframe
                    id={`featured-video-${video.id}`}
                    src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0&playsinline=1`}
                    title={`RC Premier featured property video ${index + 1}`}
                    tabIndex={0}
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <button
                    type="button"
                    aria-label={`Play featured property video ${index + 1}`}
                    onClick={() => setActiveVideo(video.id)}
                  >
                    <span className="featured-video__play" aria-hidden="true">
                      <span>▶</span>
                    </span>
                    <span>Play video</span>
                  </button>
                )}
              </div>

              <div className="featured-video__details">
                <div>
                  <p className="eyebrow">RC Premier Properties</p>
                  <h3>Featured home tour</h3>
                </div>
                <a href={video.url} target="_blank" rel="noreferrer">
                  Watch Short on YouTube <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <div className="featured-videos__controls">
        <button
          type="button"
          onClick={() => selectSlide(currentIndex - 1)}
          disabled={currentIndex === 0}
          aria-label="Previous featured property video"
        >
          <Arrow direction="left" />
        </button>
        <p aria-live="polite">
          <span className="visually-hidden">Showing video </span>
          {currentIndex + 1} / {videos.length}
        </p>
        <div className="featured-videos__dots" aria-label="Choose a featured video">
          {videos.map((video, index) => (
            <button
              key={video.id}
              type="button"
              onClick={() => selectSlide(index)}
              aria-label={`Show featured property video ${index + 1}`}
              aria-current={currentIndex === index ? "true" : undefined}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => selectSlide(currentIndex + 1)}
          disabled={currentIndex === videos.length - 1}
          aria-label="Next featured property video"
        >
          <Arrow direction="right" />
        </button>
      </div>
    </div>
  );
}
