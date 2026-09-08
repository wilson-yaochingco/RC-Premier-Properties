"use client";

import { useState } from "react";

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

export function FeaturedVideos() {
  const [active, setActive] = useState<string[]>([]);

  return (
    <div className="featured-videos">
      {videos.map((video, index) => {
        const isActive = active.includes(video.id);
        return (
          <article key={video.id} className="featured-video">
            {isActive ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
                title={`RC Premier featured property video ${index + 1}`}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                aria-label={`Play featured property video ${index + 1}`}
                onClick={() => setActive((items) => [...items, video.id])}
              >
                <span className="featured-video__number">0{index + 1}</span>
                <span className="featured-video__play" aria-hidden="true">
                  ▶
                </span>
                <span>Play video</span>
              </button>
            )}
            <a href={video.url} target="_blank" rel="noreferrer">
              Watch Short on YouTube <span aria-hidden="true">↗</span>
            </a>
          </article>
        );
      })}
    </div>
  );
}
