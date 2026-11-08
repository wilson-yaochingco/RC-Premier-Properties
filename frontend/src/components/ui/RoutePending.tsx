"use client";

import { useLinkStatus } from "next/link";

/**
 * Place inside a `<Link>` to a detail route. Detail routes have no loading.tsx (so a missing
 * record can answer with a real 404), and this marker is the click feedback instead: CSS in
 * globals.css dims the card and shows a progress cursor while the navigation is pending.
 */
export function RoutePending() {
  const { pending } = useLinkStatus();
  return <span data-route-pending={pending} hidden />;
}
