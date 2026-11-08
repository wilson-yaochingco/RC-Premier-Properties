import { Fragment, type ReactNode } from "react";

/** Renders `*word*` as an editorial accent (`<em>`, styled by the headline rule in globals). */
export function accent(text: string): ReactNode {
  return text
    .split("*")
    .map((part, index) =>
      index % 2 ? <em key={index}>{part}</em> : <Fragment key={index}>{part}</Fragment>,
    );
}

export const plain = (text: string) => text.replaceAll("*", "");
