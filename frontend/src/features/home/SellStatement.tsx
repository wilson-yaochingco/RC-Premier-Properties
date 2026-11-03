"use client";

import Link from "next/link";
import { RollLabel } from "@/components/ui/RollLabel";
import { ScrollFillText } from "./ScrollFillText";
import styles from "./sell-statement.module.css";
import { useScrollFill } from "./use-scroll-fill";

const STATEMENT =
  "Thinking of selling your property? RC\u00a0Premier helps you present it thoughtfully, bring it to the right market, and move forward with clear guidance from start to finish.";

/** One large editorial sentence, set directly on the page, with a quiet bottom row. */
export function SellStatement() {
  const { ref, active } = useScrollFill<HTMLHeadingElement>();

  return (
    <section
      className={styles.section}
      data-scrub={active ? "on" : "off"}
      aria-labelledby="sell-statement"
    >
      <div className={styles.container}>
        <h2
          id="sell-statement"
          ref={ref}
          className={styles.statement}
          aria-label={STATEMENT}
        >
          <ScrollFillText lines={[STATEMENT]} />
        </h2>

        <div className={styles.footer}>
          <Link href="/sell" className={`${styles.button} cta`}>
            <RollLabel>Sell your property</RollLabel>
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
