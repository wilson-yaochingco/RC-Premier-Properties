import { Fragment, type ReactNode } from "react";
import styles from "./scroll-fill.module.css";

/**
 * Splits text into words and characters for `useScrollFill`. Each entry in `lines` becomes a
 * span (styled by `lineClassName`, if given); words never break mid-word. The parent heading
 * should carry the full text as its `aria-label`. A word that is a key of `inline` is replaced
 * by that node (e.g. a small photograph) and takes no part in the fill.
 */
export function ScrollFillText({
  lines,
  lineClassName,
  inline,
}: {
  lines: readonly string[];
  lineClassName?: string;
  inline?: Readonly<Record<string, ReactNode>>;
}) {
  return lines.map((line, l) => (
    <Fragment key={l}>
      {l > 0 && " "}
      <span className={lineClassName}>
        {line.split(" ").map((word, w) => (
          <Fragment key={w}>
            {w > 0 && " "}
            {inline?.[word] ?? (
              <span className={styles.word} aria-hidden="true">
                {word.split("*").map((part, p) => {
                  const chars = [...part].map((char, c) => (
                    <span key={c} data-char className={styles.char}>
                      {char}
                    </span>
                  ));
                  return p % 2 ? (
                    <em key={p}>{chars}</em>
                  ) : (
                    <Fragment key={p}>{chars}</Fragment>
                  );
                })}
              </span>
            )}
          </Fragment>
        ))}
      </span>
    </Fragment>
  ));
}
