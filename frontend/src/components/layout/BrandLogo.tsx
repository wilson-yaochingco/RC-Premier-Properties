import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/brand/rc-premier-logo.png";
import { RcPremierMark } from "./RcPremierMark";

export function BrandLogo({ footer = false }: { footer?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand-logo${footer ? " brand-logo--footer" : ""}`}
      aria-label="RC Premier Properties home"
    >
      {footer ? (
        <Image src={logo} alt="" sizes="144px" />
      ) : (
        <RcPremierMark aria-hidden="true" />
      )}
    </Link>
  );
}
