"use client";

import Image from "next/image";
import { useState } from "react";
import type { PublicPropertyMedia } from "@rc/shared";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { DEVELOPMENT_SAMPLE_MEDIA_ENABLED } from "@/lib/env";

interface PropertyMediaProps {
  media?: PublicPropertyMedia;
  label?: string;
  preload?: boolean;
  className?: string;
  sizes?: string;
  fit?: "cover" | "contain";
}

function isLocalMediaUrl(url: string | undefined): url is string {
  return Boolean(
    url &&
    /^\/media\/properties\/[a-zA-Z0-9][a-zA-Z0-9/_-]*\.(?:avif|jpe?g|png|webp)$/i.test(
      url,
    ) &&
    !url.includes(".."),
  );
}

function isDevelopmentSampleUrl(media: PublicPropertyMedia | undefined): boolean {
  if (
    !DEVELOPMENT_SAMPLE_MEDIA_ENABLED ||
    media?.source !== "development-sample" ||
    !media.url
  )
    return false;
  try {
    const url = new URL(media.url);
    return (
      url.protocol === "https:" &&
      url.hostname === "images.unsplash.com" &&
      /^\/photo-[a-zA-Z0-9-]+$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function PropertyMedia({
  media,
  label = "PROPERTY IMAGE",
  preload = false,
  className = "",
  sizes = "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw",
  fit = "cover",
}: PropertyMediaProps) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const sample = isDevelopmentSampleUrl(media);
  const mediaUrl = media?.url;
  if (media?.kind !== "image" || !mediaUrl || (!isLocalMediaUrl(mediaUrl) && !sample)) {
    return (
      <MediaPlaceholder
        label={label}
        accessibleLabel={
          media?.kind === "image" && media.alt
            ? `Image unavailable: ${media.alt}`
            : undefined
        }
        ratio="landscape"
        tone="neutral"
        className={className}
      />
    );
  }

  return (
    <div className={`property-media ${className}`.trim()}>
      {failedUrl === mediaUrl ? (
        <MediaPlaceholder
          label="PROPERTY IMAGE UNAVAILABLE"
          accessibleLabel={`Image unavailable: ${media.alt}`}
          ratio="landscape"
        />
      ) : (
        <Image
          src={mediaUrl}
          alt={media.alt}
          fill
          preload={preload}
          sizes={sizes}
          onError={() => setFailedUrl(mediaUrl)}
          style={{
            objectFit: fit,
            objectPosition: media.focalPoint
              ? `${media.focalPoint.x}% ${media.focalPoint.y}%`
              : "50% 50%",
          }}
        />
      )}
      {sample && failedUrl !== mediaUrl ? (
        <span className="property-media__sample-label">
          Development sample — not this listing
        </span>
      ) : null}
    </div>
  );
}
