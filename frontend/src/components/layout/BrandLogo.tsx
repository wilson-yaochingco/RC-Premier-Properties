import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/brand/rc-premier-logo.png";

export function BrandLogo({ footer = false }: { footer?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand-logo${footer ? " brand-logo--footer" : ""}`}
      aria-label="RC Premier Properties home"
    >
      <Image
        src={logo}
        alt="RC Premier Properties"
        sizes={footer ? "144px" : "96px"}
        loading="lazy"
      />
    </Link>
  );
}
