import Link from "next/link";
import type { ReactNode } from "react";
import { RollLabel } from "./RollLabel";

type ButtonVariant = "primary" | "secondary" | "gold" | "outline" | "text";

interface ButtonProps {
  children: ReactNode;
  href?: string;
  variant?: ButtonVariant;
  type?: "button" | "submit" | "reset";
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="button__icon" viewBox="0 0 20 20" fill="none">
      <path d="M3 10h13M11 5l5 5-5 5" stroke="currentColor" />
    </svg>
  );
}

export function Button({
  children,
  href,
  variant = "primary",
  type = "button",
  className = "",
  ariaLabel,
  disabled = false,
}: ButtonProps) {
  const rolls = variant !== "text";
  const classes = `button button--${variant}${rolls ? " cta" : ""} ${className}`.trim();
  const content = (
    <>
      {rolls ? <RollLabel>{children}</RollLabel> : <span>{children}</span>}
      <ArrowIcon />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} aria-label={ariaLabel} disabled={disabled}>
      {content}
    </button>
  );
}
