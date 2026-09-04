import type { ReactNode } from "react";

interface SectionHeadingProps {
  number?: string;
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  as?: "h1" | "h2";
  className?: string;
}

export function SectionHeading({
  number,
  eyebrow,
  title,
  intro,
  as: Heading = "h2",
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={`section-heading ${className}`.trim()}>
      <div className="section-heading__meta">
        {number ? <span aria-hidden="true">{number}</span> : null}
        <p>{eyebrow}</p>
      </div>
      <div className="section-heading__content">
        <Heading>{title}</Heading>
        {intro ? <p className="section-heading__intro">{intro}</p> : null}
      </div>
    </div>
  );
}
