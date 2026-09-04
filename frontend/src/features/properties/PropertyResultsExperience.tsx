"use client";

import type { FocusEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PublicPropertySummary } from "@rc/shared";
import { PropertyMap } from "./PropertyMap";
import { mapLocationHref, propertyMapApiSearchParams } from "./property-query";
import styles from "./properties.module.css";

interface PropertyResultsExperienceProps {
  children: ReactNode;
  properties: PublicPropertySummary[];
  selectedLocation: string;
  total: number;
}

type ResultsView = "list" | "map";

function cardFromTarget(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element
    ? target.closest<HTMLElement>("[data-property-card]")
    : null;
}

export function PropertyResultsExperience({
  children,
  properties,
  selectedLocation,
  total,
}: PropertyResultsExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ResultsView>("list");
  const [activePropertyId, setActivePropertyId] = useState<string>();
  const [isNavigating, startNavigation] = useTransition();
  const currentSearch = Object.fromEntries(searchParams.entries());
  const mapQuery = propertyMapApiSearchParams(currentSearch).toString();

  const setLocation = useCallback(
    (location: string) => {
      const nextSearch = Object.fromEntries(searchParams.entries());

      startNavigation(() => {
        router.push(mapLocationHref(nextSearch, location), { scroll: false });
      });
    },
    [router, searchParams],
  );

  const activateCard = useCallback((propertyId: string, reveal = false) => {
    setActivePropertyId(propertyId);

    const cards = document.querySelectorAll<HTMLElement>("[data-property-card]");
    let selectedCard: HTMLElement | undefined;
    cards.forEach((card) => {
      const selected = card.dataset.propertyId === propertyId;
      if (selected) selectedCard = card;
      if (selected) card.dataset.mapActive = "true";
      else delete card.dataset.mapActive;
    });

    if (reveal && selectedCard) {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      selectedCard.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
    }
  }, []);

  const clearCard = useCallback(() => {
    setActivePropertyId(undefined);
    document
      .querySelectorAll<HTMLElement>("[data-property-card][data-map-active]")
      .forEach((card) => delete card.dataset.mapActive);
  }, []);

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
    <div className={styles.resultsExperience} data-results-view={view}>
      <div className={styles.viewToolbar} aria-label="Property results view">
        <div
          className={styles.viewToggle}
          role="group"
          aria-label="Choose results view"
        >
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            List
          </button>
          <button
            type="button"
            aria-pressed={view === "map"}
            onClick={() => setView("map")}
          >
            Map
          </button>
        </div>
        <p>
          The list remains the complete, accessible source of results. Map pins appear
          only where a public location has been approved.
        </p>
      </div>

      <div className={styles.resultsLayout}>
        <div
          className={styles.resultsPane}
          onPointerOver={handlePointerOver}
          onPointerLeave={handlePointerLeave}
          onFocusCapture={handleFocus}
          onBlurCapture={handleBlur}
        >
          {children}
        </div>

        <aside className={styles.mapPane} aria-label="Pampanga property map">
          <div className={styles.regionSummary} aria-live="polite">
            <div>
              <span>{selectedLocation ? "Selected location" : "Map coverage"}</span>
              <strong>{selectedLocation || "Pampanga and Angeles City"}</strong>
            </div>
            <p>
              {total === 0
                ? "No available RC Premier Properties listings in this area."
                : `${total.toLocaleString("en-PH")} matching published ${total === 1 ? "property" : "properties"}`}
            </p>
            {selectedLocation ? (
              <button
                type="button"
                onClick={() => setLocation("")}
                disabled={isNavigating}
              >
                Clear map location
              </button>
            ) : null}
          </div>

          <PropertyMap
            properties={properties}
            selectedRegion={selectedLocation}
            activePropertyId={activePropertyId}
            forceLoad={view === "map"}
            mapQuery={mapQuery}
            onPropertyActivate={activateCard}
            onRegionSelect={setLocation}
          />
        </aside>
      </div>
    </div>
  );
}
