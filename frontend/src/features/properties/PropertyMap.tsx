"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { PublicPropertySummary } from "@rc/shared";
import { PropertyMapErrorBoundary } from "./PropertyMapErrorBoundary";
import styles from "./property-map.module.css";

const LeafletPropertyMap = dynamic(
  () => import("./PropertyMapCanvas").then((module) => module.PropertyMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className={styles.loading} role="status">
        Preparing the interactive map…
      </div>
    ),
  },
);

interface PropertyMapProps {
  properties: PublicPropertySummary[];
  selectedRegion: string;
  activePropertyId?: string;
  forceLoad: boolean;
  mapQuery?: string;
  onPropertyActivate: (propertyId: string, reveal?: boolean) => void;
  onRegionSelect: (region: string) => void;
}

export function PropertyMap({
  properties,
  selectedRegion,
  activePropertyId,
  forceLoad,
  mapQuery,
  onPropertyActivate,
  onRegionSelect,
}: PropertyMapProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [manuallyRequested, setManuallyRequested] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || nearViewport) return;

    const desktopOrTablet = window.matchMedia("(min-width: 48rem)");
    if (!desktopOrTablet.matches) return;

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [nearViewport]);

  const shouldLoad = forceLoad || manuallyRequested || nearViewport;

  return (
    <div ref={rootRef} className={styles.shell} data-map-shell>
      <div className={styles.mapHeading}>
        <div>
          <span>Interactive discovery</span>
          <h3>Pampanga property map</h3>
        </div>
        <p>Administrative areas are approximate and intended for discovery.</p>
      </div>

      {shouldLoad ? (
        <PropertyMapErrorBoundary>
          <LeafletPropertyMap
            properties={properties}
            selectedRegion={selectedRegion}
            activePropertyId={activePropertyId}
            mapQuery={mapQuery}
            onPropertyActivate={onPropertyActivate}
            onRegionSelect={onRegionSelect}
          />
        </PropertyMapErrorBoundary>
      ) : (
        <div className={styles.consentPlaceholder}>
          <p>
            Load the map when you need geographic browsing. Search filters and property
            cards work without it.
          </p>
          <button type="button" onClick={() => setManuallyRequested(true)}>
            Load interactive map
          </button>
        </div>
      )}
    </div>
  );
}
