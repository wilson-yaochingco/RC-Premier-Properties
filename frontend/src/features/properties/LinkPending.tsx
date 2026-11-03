"use client";

import { useLinkStatus } from "next/link";
import { useEffect, useRef } from "react";
import { markCatalogUpdating } from "./catalog-updating";

/** Place inside a `<Link>`: dims the catalog while that link's navigation is pending. */
export function LinkPending() {
  const { pending } = useLinkStatus();
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = marker.current;
    if (!pending) return;
    markCatalogUpdating(element, true);
    return () => markCatalogUpdating(element, false);
  }, [pending]);

  return <span ref={marker} hidden />;
}
