import { Button } from "./Button";

interface EmptyStateProps {
  eyebrow?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
  headingLevel?: "h1" | "h2" | "h3";
}

export function EmptyState({
  eyebrow = "Catalogue update",
  title,
  description,
  actionLabel,
  actionHref,
  className = "",
  headingLevel: Heading = "h3",
}: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      <span className="empty-state__index" aria-hidden="true">
        —
      </span>
      <div className="empty-state__content">
        <p className="eyebrow">{eyebrow}</p>
        <Heading>{title}</Heading>
        <p>{description}</p>
        {actionLabel && actionHref ? (
          <Button href={actionHref} variant="outline">
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
