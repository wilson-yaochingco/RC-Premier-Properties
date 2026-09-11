"use client";

import type { FocusEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PublicPropertySummary } from "@rc/shared";
import { publicLocationPath } from "@/lib/public-location";
import { PropertyMap } from "@/features/properties/PropertyMap";
import styles from "./locations.module.css";

function cardFromTarget(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element
    ? target.closest<HTMLElement>("[data-property-card]")
    : null;
}

export function LocationInventoryMap({
  children,
  properties,
  location,
  mapQuery,
}: {
  children: ReactNode;
  properties: PublicPropertySummary[];
  location: string;
  mapQuery: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);
  const [activePropertyId, setActivePropertyId] = useState<string>();
  const [, startNavigation] = useTransition();

  const activateCard = useCallback((propertyId: string, reveal = false) => {
    setActivePropertyId(propertyId);

    const cards =
      rootRef.current?.querySelectorAll<HTMLElement>("[data-property-card]");
    let selectedCard: HTMLElement | undefined;
    cards?.forEach((card) => {
      const selected = card.dataset.propertyId === propertyId;
      if (selected) selectedCard = card;
      if (selected) card.dataset.mapActive = "true";
      else delete card.dataset.mapActive;
    });

    if (reveal && selectedCard) {
      selectedCard.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "center",
      });
    }
  }, []);

  const clearCard = useCallback(() => {
    setActivePropertyId(undefined);
    rootRef.current
      ?.querySelectorAll<HTMLElement>("[data-property-card][data-map-active]")
      .forEach((card) => delete card.dataset.mapActive);
  }, []);

  const setLocation = useCallback(
    (region: string) => {
      const query = new URLSearchParams(searchParams.toString());
      query.delete("location");
      query.delete("page");
      const destination = region.trim() ? publicLocationPath(region) : "/properties";

      startNavigation(() => {
        router.push(`${destination}${query.size ? `?${query.toString()}` : ""}`, {
          scroll: false,
        });
      });
    },
    [router, searchParams],
  );

  function handlePointerOver(event: PointerEvent<HTMLDivElement>) {
    const card = cardFromTarget(event.target);
    if (card?.dataset.propertyId) activateCard(card.dataset.propertyId);
  }

  function handlePointerLeave(event: MouseEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) clearCard();
  }

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    const card = cardFromTarget(event.target);
    if (card?.dataset.propertyId) activateCard(card.dataset.propertyId);
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) clearCard();
  }

  return (
    <div ref={rootRef} className={styles.inventoryLayout}>
      <aside className={styles.inventoryMap} aria-label={`${location} property map`}>
        <PropertyMap
          properties={properties}
          selectedRegion={location}
          activePropertyId={activePropertyId}
          forceLoad={false}
          mapQuery={mapQuery}
          variant="catalog"
          onPropertyActivate={activateCard}
          onRegionSelect={setLocation}
        />
      </aside>
      <div
        className={styles.inventoryResults}
        onPointerOver={handlePointerOver}
        onPointerLeave={handlePointerLeave}
        onFocusCapture={handleFocus}
        onBlurCapture={handleBlur}
      >
        {children}
      </div>
    </div>
  );
}
