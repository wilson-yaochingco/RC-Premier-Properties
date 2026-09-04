"use client";

import { useEffect, useRef, useState } from "react";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Layer, Map as LeafletMap, Marker } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import {
  API_PREFIX,
  type PropertyMapResponse,
  type PublicPropertyMapItem,
  type PublicPropertySummary,
} from "@rc/shared";
import { MAP_TILE_URL } from "@/lib/env";
import { apiRequest } from "@/services/api-client";
import { formatLocation, formatPrice } from "./property-format";
import styles from "./property-map.module.css";

const BOUNDARY_URL = "/geo/pampanga-admin3.geojson";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://stadiamaps.com/attribution/" target="_blank" rel="noopener noreferrer">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> | Boundaries: <a href="https://data.humdata.org/dataset/cod-ab-phl" target="_blank" rel="noopener noreferrer">OCHA/NAMRIA/PSA</a>, <a href="https://creativecommons.org/licenses/by/3.0/igo/" target="_blank" rel="noopener noreferrer">CC BY 3.0 IGO</a>';

interface RegionProperties {
  name: string;
  filterValue: string;
  scope: "pampanga" | "angeles";
  psgcCode?: string;
}

type RegionCollection = FeatureCollection<Geometry, RegionProperties>;

interface PropertyMapCanvasProps {
  properties: PublicPropertySummary[];
  selectedRegion: string;
  activePropertyId?: string;
  mapQuery?: string;
  onPropertyActivate: (propertyId: string, reveal?: boolean) => void;
  onRegionSelect: (region: string) => void;
}

type MappableProperty = PublicPropertySummary | PublicPropertyMapItem;

function isRegionCollection(value: unknown): value is RegionCollection {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RegionCollection>;
  if (candidate.type !== "FeatureCollection" || !Array.isArray(candidate.features)) {
    return false;
  }

  return candidate.features.every((feature) => {
    if (!feature || feature.type !== "Feature" || !feature.geometry) return false;
    if (!(["Polygon", "MultiPolygon"] as string[]).includes(feature.geometry.type)) {
      return false;
    }
    const properties = feature.properties as Partial<RegionProperties> | null;
    return Boolean(
      properties &&
      typeof properties.name === "string" &&
      typeof properties.filterValue === "string" &&
      (properties.scope === "pampanga" || properties.scope === "angeles"),
    );
  });
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase("en-PH");
}

function boundaryStyle(selected: boolean): L.PathOptions {
  return {
    color: selected ? "#806024" : "#3a424f",
    fillColor: selected ? "#b4893d" : "#ffffff",
    fillOpacity: selected ? 0.3 : 0.08,
    opacity: 0.9,
    weight: selected ? 3 : 1.5,
  };
}

function propertyPoint(property: MappableProperty): L.LatLngTuple | undefined {
  const point = property.location.publicPoint;
  if (!point || point.type !== "Point") return undefined;
  const [longitude, latitude] = point.coordinates;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return undefined;
  }
  return [latitude, longitude];
}

function markerIcon(active: boolean): L.DivIcon {
  return L.divIcon({
    className: "rc-map-marker-shell",
    html: `<span class="rc-map-marker${active ? " rc-map-marker--active" : ""}" aria-hidden="true"></span>`,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
    popupAnchor: [0, -14],
  });
}

function popupCard(property: MappableProperty): HTMLElement {
  const root = document.createElement("article");
  root.className = "rc-map-popup";

  const eyebrow = document.createElement("span");
  eyebrow.textContent = `ID ${property.propertyId}`;

  const title = document.createElement("strong");
  title.textContent = property.title;

  const location = document.createElement("p");
  location.textContent = formatLocation(property.location);

  const price = document.createElement("p");
  price.className = "rc-map-popup__price";
  price.textContent = formatPrice(property.price.amount, property.price.currency);

  const link = document.createElement("a");
  link.href = `/properties/${encodeURIComponent(property.slug)}`;
  link.textContent = "View property \u2197";

  root.append(eyebrow, title, location, price, link);
  return root;
}

export function PropertyMapCanvas({
  properties,
  selectedRegion,
  activePropertyId,
  mapQuery,
  onPropertyActivate,
  onRegionSelect,
}: PropertyMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | undefined>(undefined);
  const boundaryRef = useRef<L.GeoJSON<RegionProperties> | undefined>(undefined);
  const boundaryLayersRef = useRef(new Map<string, Layer>());
  const markersRef = useRef(new Map<string, Marker>());
  const markerGroupRef = useRef<L.MarkerClusterGroup | undefined>(undefined);
  const propertyCallbackRef = useRef(onPropertyActivate);
  const regionCallbackRef = useRef(onRegionSelect);
  const [boundaries, setBoundaries] = useState<RegionCollection>();
  const [boundaryError, setBoundaryError] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [mapResult, setMapResult] = useState<{
    query: string;
    response?: PropertyMapResponse;
    failed: boolean;
  }>();

  useEffect(() => {
    propertyCallbackRef.current = onPropertyActivate;
  }, [onPropertyActivate]);

  useEffect(() => {
    regionCallbackRef.current = onRegionSelect;
  }, [onRegionSelect]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(BOUNDARY_URL, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Boundary request failed: ${response.status}`);
        const value: unknown = await response.json();
        if (!isRegionCollection(value)) throw new Error("Boundary data is invalid.");
        setBoundaries(value);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setBoundaryError(true);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (mapQuery === undefined) return;
    const controller = new AbortController();
    const path = `${API_PREFIX}/properties/map${mapQuery ? `?${mapQuery}` : ""}`;

    apiRequest<PropertyMapResponse>(path, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        setMapResult({ query: mapQuery, response, failed: false });
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setMapResult({ query: mapQuery, failed: true });
        }
      });

    return () => controller.abort();
  }, [mapQuery]);

  const effectiveMapResult = mapResult?.query === mapQuery ? mapResult : undefined;
  const displayedProperties: MappableProperty[] =
    effectiveMapResult?.response?.items ?? properties;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !boundaries || mapRef.current) return;

    const boundaryLayers = boundaryLayersRef.current;
    const markers = markersRef.current;

    const map = L.map(container, {
      scrollWheelZoom: false,
      zoomControl: true,
    });
    mapRef.current = map;

    let tileFailures = 0;
    const tiles = L.tileLayer(MAP_TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 20,
    });
    tiles.on("tileerror", () => {
      tileFailures += 1;
      if (tileFailures >= 4) setTileError(true);
    });
    tiles.addTo(map);

    const regions = L.geoJSON<RegionProperties>(boundaries, {
      style: (feature) =>
        boundaryStyle(
          normalized(feature?.properties.filterValue ?? "") ===
            normalized(selectedRegion),
        ),
      onEachFeature: (feature: Feature<Geometry, RegionProperties>, layer) => {
        const { filterValue, name } = feature.properties;
        boundaryLayers.set(normalized(filterValue), layer);
        layer.bindTooltip(name, { direction: "top", sticky: true });
        layer.on("click", () => {
          if (layer instanceof L.Path) layer.setStyle(boundaryStyle(true));
          const boundsLayer = layer as L.Polygon;
          map.fitBounds(boundsLayer.getBounds(), { maxZoom: 12, padding: [24, 24] });
          regionCallbackRef.current(filterValue);
        });
        layer.on("add", () => {
          if (!(layer instanceof L.Path)) return;
          const element = layer.getElement();
          if (!element) return;
          element.setAttribute("tabindex", "0");
          element.setAttribute("role", "button");
          element.setAttribute("aria-label", `Filter properties by ${name}`);
          element.addEventListener("keydown", (event) => {
            if (!(event instanceof window.KeyboardEvent)) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              layer.fire("click");
            }
          });
        });
      },
    }).addTo(map);
    boundaryRef.current = regions;
    map.fitBounds(regions.getBounds(), { padding: [16, 16] });

    const markerGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 45,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) =>
        L.divIcon({
          className: "rc-map-cluster-shell",
          html: `<span class="rc-map-cluster">${cluster.getChildCount()}</span>`,
          iconSize: [42, 42],
        }),
    });
    markerGroup.addTo(map);
    markerGroupRef.current = markerGroup;

    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(container);

    return () => {
      observer.disconnect();
      boundaryLayers.clear();
      markers.clear();
      map.remove();
      mapRef.current = undefined;
      boundaryRef.current = undefined;
      markerGroupRef.current = undefined;
    };
    // The initial selection is applied again by the dedicated effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundaries]);

  useEffect(() => {
    const selected = normalized(selectedRegion);
    boundaryRef.current?.eachLayer((layer) => {
      if (!(layer instanceof L.Path)) return;
      const feature = (
        layer as L.Path & { feature?: Feature<Geometry, RegionProperties> }
      ).feature;
      const matches = normalized(feature?.properties.filterValue ?? "") === selected;
      layer.setStyle(boundaryStyle(matches));
    });

    const selectedLayer = boundaryLayersRef.current.get(selected);
    if (selectedLayer && selectedLayer instanceof L.Polygon && mapRef.current) {
      mapRef.current.fitBounds(selectedLayer.getBounds(), {
        maxZoom: 12,
        padding: [24, 24],
      });
    }
  }, [selectedRegion, boundaries]);

  useEffect(() => {
    const group = markerGroupRef.current;
    if (!group) return;

    group.clearLayers();
    markersRef.current.clear();

    for (const property of displayedProperties) {
      const point = propertyPoint(property);
      if (!point) continue;

      const marker = L.marker(point, {
        icon: markerIcon(false),
        keyboard: true,
        title: `${property.title}, ${formatLocation(property.location)}`,
      });
      marker.bindPopup(popupCard(property), { closeButton: true, minWidth: 220 });
      marker.on("mouseover focus", () =>
        propertyCallbackRef.current(property.id, false),
      );
      marker.on("click", () => propertyCallbackRef.current(property.id, true));
      markersRef.current.set(property.id, marker);
      group.addLayer(marker);
    }
  }, [displayedProperties, boundaries]);

  useEffect(() => {
    markersRef.current.forEach((marker, propertyId) => {
      marker.setIcon(markerIcon(propertyId === activePropertyId));
      if (propertyId === activePropertyId) marker.setZIndexOffset(1000);
      else marker.setZIndexOffset(0);
    });
  }, [activePropertyId, displayedProperties]);

  if (boundaryError) {
    return (
      <div className={styles.failure} role="status">
        <strong>Map boundaries are temporarily unavailable.</strong>
        <p>Use the location filter and property list to continue browsing.</p>
      </div>
    );
  }

  const pinnedCount = displayedProperties.filter((property) =>
    propertyPoint(property),
  ).length;
  const regionOptions = boundaries?.features
    .map((feature) => feature.properties)
    .sort((left, right) => left.name.localeCompare(right.name, "en-PH"));
  const selectedOption = regionOptions?.some(
    (region) => normalized(region.filterValue) === normalized(selectedRegion),
  )
    ? selectedRegion
    : "";

  return (
    <div className={styles.canvasFrame}>
      <label className={styles.regionPicker}>
        <span>Browse an area</span>
        <select
          value={selectedOption}
          onChange={(event) => regionCallbackRef.current(event.target.value)}
        >
          <option value="">All Pampanga areas</option>
          {regionOptions?.map((region) => (
            <option key={region.filterValue} value={region.filterValue}>
              {region.name}
            </option>
          ))}
        </select>
      </label>
      <div
        ref={containerRef}
        className={styles.mapCanvas}
        aria-label="Interactive map of approximate Pampanga administrative areas and approved public property pins"
      />
      <div className={styles.mapStatus} aria-live="polite">
        {effectiveMapResult?.response
          ? `${effectiveMapResult.response.returned}${
              effectiveMapResult.response.truncated
                ? ` of ${effectiveMapResult.response.mappableTotal}`
                : ""
            } approved public ${effectiveMapResult.response.returned === 1 ? "pin" : "pins"} for ${effectiveMapResult.response.matchingTotal} matching ${effectiveMapResult.response.matchingTotal === 1 ? "property" : "properties"}.`
          : pinnedCount === 0
            ? "No listings on this page have an approved public pin."
            : `${pinnedCount} approved public pin${pinnedCount === 1 ? "" : "s"} on this results page.`}
      </div>
      {effectiveMapResult?.failed ? (
        <div className={styles.mapDataFailure} role="status">
          Map-wide pins are unavailable. Showing approved pins from this results page.
        </div>
      ) : null}
      {tileError ? (
        <div className={styles.tileFailure} role="status">
          Base-map tiles are unavailable. Administrative areas and property results
          remain usable.
        </div>
      ) : null}
    </div>
  );
}
