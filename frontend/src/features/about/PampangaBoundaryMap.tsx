"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./about-experience.module.css";

interface BoundaryGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

interface BoundaryCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { name: string };
    geometry: BoundaryGeometry;
  }>;
}

type LoadState = BoundaryCollection | "error" | undefined;

function isBoundaryCollection(value: unknown): value is BoundaryCollection {
  if (!value || typeof value !== "object") return false;
  const collection = value as Partial<BoundaryCollection>;
  return (
    collection.type === "FeatureCollection" &&
    Array.isArray(collection.features) &&
    collection.features.length === 22 &&
    collection.features.every(
      (feature) =>
        feature?.type === "Feature" &&
        (feature.geometry?.type === "Polygon" ||
          feature.geometry?.type === "MultiPolygon") &&
        Array.isArray(feature.geometry.coordinates),
    )
  );
}

function geometryRings(geometry: BoundaryGeometry): number[][][] {
  return geometry.type === "Polygon"
    ? (geometry.coordinates as number[][][])
    : (geometry.coordinates as number[][][][]).flat();
}

function projectedPaths(collection: BoundaryCollection): string[] {
  const rings = collection.features.flatMap((feature) =>
    geometryRings(feature.geometry),
  );
  const points = rings.flat();
  const longitudes = points.map(([longitude]) => longitude ?? 0);
  const latitudes = points.map(([, latitude]) => latitude ?? 0);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const width = Math.max(east - west, Number.EPSILON);
  const height = Math.max(north - south, Number.EPSILON);

  return collection.features.map((feature) =>
    geometryRings(feature.geometry)
      .map(
        (ring) =>
          ring
            .map(([longitude = west, latitude = south], index) => {
              const x = 30 + ((longitude - west) / width) * 640;
              const y = 20 + ((north - latitude) / height) * 600;
              return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
            })
            .join(" ") + " Z",
      )
      .join(" "),
  );
}

export function PampangaBoundaryMap() {
  const [collection, setCollection] = useState<LoadState>();

  useEffect(() => {
    const controller = new AbortController();
    fetch("/geo/pampanga-admin3.geojson", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Boundary request failed.");
        const value: unknown = await response.json();
        if (!isBoundaryCollection(value)) throw new Error("Boundary data is invalid.");
        setCollection(value);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setCollection("error");
        }
      });
    return () => controller.abort();
  }, []);

  const paths = useMemo(
    () => (collection && collection !== "error" ? projectedPaths(collection) : []),
    [collection],
  );

  return (
    <figure className={styles.boundaryMap}>
      {collection === "error" ? (
        <p role="status">The Pampanga boundary is temporarily unavailable.</p>
      ) : paths.length ? (
        <svg
          viewBox="0 0 700 640"
          role="img"
          aria-label="Still two-dimensional map of Pampanga city and municipality boundaries"
        >
          <title>Pampanga boundary map</title>
          {paths.map((path, index) => (
            <path key={index} d={path} />
          ))}
        </svg>
      ) : (
        <p role="status">Preparing the Pampanga boundary…</p>
      )}
      <figcaption>
        Pampanga · approximate administrative boundaries for regional orientation
      </figcaption>
    </figure>
  );
}
