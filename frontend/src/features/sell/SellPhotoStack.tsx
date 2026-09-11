"use client";

import Image, { type StaticImageData } from "next/image";
import { useRef, useState } from "react";
import styles from "./sell-photo-stack.module.css";

export interface SellPhoto {
  src: StaticImageData;
  alt: string;
  label: string;
}

export function SellPhotoStack({ photos }: { photos: readonly SellPhoto[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStartX = useRef<number | undefined>(undefined);

  const move = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + photos.length) % photos.length);
  };

  return (
    <div
      className={styles.stack}
      role="group"
      aria-roledescription="three-photo card stack"
      aria-label="Seller experience photography"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          move(-1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          move(1);
        }
      }}
      onPointerDown={(event) => {
        pointerStartX.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (pointerStartX.current === undefined) return;
        const distance = event.clientX - pointerStartX.current;
        pointerStartX.current = undefined;
        if (Math.abs(distance) >= 45) move(distance < 0 ? 1 : -1);
      }}
      onPointerCancel={() => {
        pointerStartX.current = undefined;
      }}
    >
      <div className={styles.cards} aria-live="polite">
        {photos.map((photo, index) => {
          const relative = (index - activeIndex + photos.length) % photos.length;
          return (
            <figure
              key={photo.label}
              className={styles.card}
              data-position={relative}
              aria-hidden={relative !== 0}
            >
              <Image
                src={photo.src}
                alt={relative === 0 ? photo.alt : ""}
                fill
                sizes="(max-width: 800px) 86vw, 56rem"
                draggable={false}
              />
              {relative === 0 ? (
                <figcaption>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {photo.label}
                </figcaption>
              ) : null}
            </figure>
          );
        })}
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label="Previous seller photo"
        >
          <span aria-hidden="true">←</span>
        </button>
        <span aria-hidden="true">
          {String(activeIndex + 1).padStart(2, "0")} /{" "}
          {String(photos.length).padStart(2, "0")}
        </span>
        <button type="button" onClick={() => move(1)} aria-label="Next seller photo">
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
