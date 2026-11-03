import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { homesLabel } from "./location-labels";
import type { LocationEditorialContent } from "./location-content";
import styles from "./location-atlas.module.css";

export interface LocationStory {
  slug: string;
  name: string;
  href: string;
  count: number;
  content?: LocationEditorialContent;
  fallbackImage: StaticImageData;
}

/** Three compositions repeat in order so a long list keeps one rhythm. */
const LAYOUTS = ["imageLeft", "imageRight", "wide"] as const;

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function LocationStories({ stories }: { stories: LocationStory[] }) {
  return (
    <ol className={styles.stories}>
      {stories.map((story, index) => {
        const layout = LAYOUTS[index % LAYOUTS.length]!;
        const scenery = story.content?.scenery;
        const number = String(index + 1).padStart(2, "0");
        return (
          <li key={story.slug} className={`${styles.story} ${styles[layout]}`}>
            <figure className={styles.storyMedia}>
              <div className={styles.storyFrame}>
                <Image
                  src={scenery?.imagePath ?? story.fallbackImage}
                  alt={scenery?.alt ?? ""}
                  fill
                  sizes={
                    layout === "wide"
                      ? "(max-width: 767px) 100vw, 90vw"
                      : "(max-width: 767px) 100vw, 58vw"
                  }
                />
              </div>
              {scenery ? (
                <figcaption className={styles.credit}>
                  Photo: {scenery.creator} ·{" "}
                  <a href={scenery.sourceUrl} target="_blank" rel="noreferrer">
                    Wikimedia Commons
                  </a>{" "}
                  ·{" "}
                  {scenery.licenseUrl ? (
                    <a href={scenery.licenseUrl} target="_blank" rel="noreferrer">
                      {scenery.license}
                    </a>
                  ) : (
                    scenery.license
                  )}
                </figcaption>
              ) : null}
            </figure>

            <div className={styles.storyCopy}>
              <span className={styles.storyNumber} aria-hidden="true">
                {number}
              </span>
              <p className={styles.storyMeta}>
                {story.content?.classification ?? "Location"} · Pampanga
              </p>
              <h3 id={`story-${story.slug}`} className={styles.storyName}>
                {story.name}
              </h3>
              <p className={styles.storyCount}>
                {homesLabel(story.count)} currently published
              </p>
              {scenery ? (
                <p className={styles.storyCaption}>{scenery.caption}</p>
              ) : null}
              <Link href={story.href} className={styles.storyLink}>
                <span>
                  Explore homes <span className={styles.srOnly}>in {story.name}</span>
                </span>
                <Arrow />
              </Link>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
