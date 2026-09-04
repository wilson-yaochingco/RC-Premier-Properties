import type { HTMLAttributes } from "react";

type SectionTone = "base" | "soft" | "dark" | "accent";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  tone?: SectionTone;
}

export function Section({ className = "", tone = "base", ...props }: SectionProps) {
  return (
    <section className={`section section--${tone} ${className}`.trim()} {...props} />
  );
}
