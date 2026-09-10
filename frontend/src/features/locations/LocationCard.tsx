import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { publicLocationPath, shortPublicLocation } from "@/lib/public-location";
import styles from "./locations.module.css";

export function LocationCard({
  location,
  count,
  image,
}: {
  location: string;
  count: number;
  image: StaticImageData;
}) {
  const name = shortPublicLocation(location);

  return (
    <li className={styles.locationCard}>
      <Link href={publicLocationPath(location)}>
        <Image
          src={image}
          alt=""
          fill
          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
        />
        <span className={styles.locationShade} aria-hidden="true" />
        <span className={styles.locationCardCopy}>
          <strong>{name}</strong>
          <span>
            {count.toLocaleString("en-PH")} published{" "}
            {count === 1 ? "property" : "properties"}
          </span>
        </span>
        <span className={styles.locationArrow} aria-hidden="true">
          ↗
        </span>
      </Link>
    </li>
  );
}
