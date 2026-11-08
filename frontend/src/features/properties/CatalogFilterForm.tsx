"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useTransition,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { catalogFormHref } from "./catalog-form-url";
import { markCatalogUpdating } from "./catalog-updating";

interface CatalogFilterFormProps {
  children: ReactNode;
  id?: string;
  className?: string;
  onSubmitCapture?: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * Hybrid filter form. A discrete choice (any select) applies at once with `replace`, so
 * quick refinements don't stack history entries; typed fields only apply on Enter or the
 * Search button (`push`), never per keystroke. Without JavaScript the form still performs a
 * normal GET.
 */
export function CatalogFilterForm({
  children,
  id,
  className,
  onSubmitCapture,
}: CatalogFilterFormProps) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const focusedId = useRef<string>(undefined);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const element = form.current;
    markCatalogUpdating(element, pending);
    if (pending) return () => markCatalogUpdating(element, false);
    // The applied values re-key the fields; hand focus back if the new ones replaced it.
    const id = focusedId.current;
    if (id && document.activeElement === document.body) {
      document.getElementById(id)?.focus({ preventScroll: true });
    }
  }, [pending]);

  function apply(mode: "push" | "replace") {
    const element = form.current;
    if (!element) return;
    const href = catalogFormHref(new FormData(element));
    if (href === `${window.location.pathname}${window.location.search}`) return;
    startTransition(() => {
      if (mode === "push") router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    });
  }

  function handleChange(event: ChangeEvent<HTMLFormElement>) {
    if (!(event.target instanceof HTMLSelectElement)) return;
    focusedId.current = event.target.id;
    apply("replace");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const active = document.activeElement;
    focusedId.current = active instanceof HTMLElement ? active.id : undefined;
    apply("push");
  }

  return (
    <form
      ref={form}
      id={id}
      action="/properties"
      method="get"
      role="search"
      aria-label="Filter properties for sale"
      className={className}
      onChange={handleChange}
      onSubmit={handleSubmit}
      onSubmitCapture={onSubmitCapture}
    >
      {children}
    </form>
  );
}
