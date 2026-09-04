type MediaRatio = "hero" | "landscape" | "portrait" | "square" | "map";
type MediaTone = "neutral" | "violet" | "dark";

interface MediaPlaceholderProps {
  label: string;
  ratio?: MediaRatio;
  tone?: MediaTone;
  className?: string;
}

export function MediaPlaceholder({
  label,
  ratio = "landscape",
  tone = "neutral",
  className = "",
}: MediaPlaceholderProps) {
  const visibleLabel = label.startsWith("[") ? label : `[${label}]`;

  return (
    <div
      className={`media-placeholder media-placeholder--${ratio} media-placeholder--${tone} ${className}`.trim()}
      role="img"
      aria-label={`Media placeholder: ${visibleLabel.slice(1, -1)}`}
    >
      <span className="media-placeholder__line" aria-hidden="true" />
      <span>{visibleLabel}</span>
      <span className="media-placeholder__line" aria-hidden="true" />
    </div>
  );
}
