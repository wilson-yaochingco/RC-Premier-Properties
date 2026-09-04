import Image from "next/image";
import type { PublicPropertyMedia } from "@rc/shared";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";

interface PropertyMediaProps {
  media?: PublicPropertyMedia;
  label?: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
}

function isLocalMediaUrl(url: string | undefined): url is string {
  return Boolean(url?.startsWith("/") && !url.startsWith("//"));
}

export function PropertyMedia({
  media,
  label = "PROPERTY IMAGE",
  priority = false,
  className = "",
  sizes = "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw",
}: PropertyMediaProps) {
  if (media?.kind !== "image" || !isLocalMediaUrl(media.url)) {
    return (
      <MediaPlaceholder
        label={label}
        ratio="landscape"
        tone="violet"
        className={className}
      />
    );
  }

  return (
    <div className={`property-media ${className}`.trim()}>
      <Image src={media.url} alt={media.alt} fill priority={priority} sizes={sizes} />
    </div>
  );
}
