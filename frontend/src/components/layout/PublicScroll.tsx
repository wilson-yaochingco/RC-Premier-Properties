"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis } from "lenis/react";

function subscribeMotion(onChange: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}

export function PublicScroll({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return children;

  return (
    <ReactLenis
      root
      options={{
        autoRaf: !reducedMotion,
        smoothWheel: !reducedMotion,
        syncTouch: false,
        lerp: 0.075,
      }}
    >
      {children}
    </ReactLenis>
  );
}
