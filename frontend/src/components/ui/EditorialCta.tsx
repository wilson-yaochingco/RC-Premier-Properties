import Image from "next/image";
import Link from "next/link";
import { RollLabel } from "./RollLabel";
import styles from "./editorial-cta.module.css";

interface EditorialCtaProps {
  eyebrow: string;
  /** Headline lines; each renders on its own line at every width. */
  headline: string[];
  body: string;
  label: string;
  href: string;
  id: string;
  /** Banner spanning the page gutters with a capped centre column. */
  wide?: boolean;
}

/** Decorative approved drawing with a transparent ground, printed on the card surface. */
function House({ side }: { side: "left" | "right" }) {
  return (
    <Image
      className={`${styles.house} ${styles[side]}`}
      src={`/images/properties/cta-house-${side}.svg`}
      alt=""
      aria-hidden="true"
      width={600}
      height={980}
      sizes="25vw"
    />
  );
}

/** Compact closing card: one Deep Charcoal surface framed by architectural line art. */
export function EditorialCta({
  eyebrow,
  headline,
  body,
  label,
  href,
  id,
  wide,
}: EditorialCtaProps) {
  return (
    <section
      className={`${styles.section} ${wide ? styles.wide : ""}`}
      aria-labelledby={id}
    >
      <div className={styles.container}>
        <div className={styles.card}>
          <House side="left" />
          <div className={styles.center}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h2 id={id}>
              {headline.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h2>
            <p className={styles.body}>{body}</p>
            <Link href={href} className={`${styles.cta} cta`}>
              <RollLabel>{label}</RollLabel>
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </Link>
          </div>
          <House side="right" />
        </div>
      </div>
    </section>
  );
}
