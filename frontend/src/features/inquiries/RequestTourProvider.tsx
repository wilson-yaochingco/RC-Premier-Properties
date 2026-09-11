"use client";

import type { PublicPropertyMedia } from "@rc/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { RequestTourModal } from "./RequestTourModal";

export interface TourPropertyContext {
  propertyId?: string;
  title?: string;
  media?: PublicPropertyMedia;
}

interface RequestTourContextValue {
  openTour: (property?: TourPropertyContext, trigger?: HTMLElement | null) => void;
}

const RequestTourContext = createContext<RequestTourContextValue | null>(null);

export function useRequestTour() {
  const context = useContext(RequestTourContext);
  if (!context) {
    throw new Error("useRequestTour must be used within RequestTourProvider.");
  }
  return context;
}

export function RequestTourProvider({ children }: { children: ReactNode }) {
  const [property, setProperty] = useState<TourPropertyContext>();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  const openTour = useCallback(
    (nextProperty?: TourPropertyContext, trigger?: HTMLElement | null) => {
      triggerRef.current = trigger ?? null;
      setProperty(nextProperty);
      setIsOpen(true);
    },
    [],
  );

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    setProperty(undefined);
    const trigger = triggerRef.current;
    triggerRef.current = null;
    requestAnimationFrame(() => trigger?.focus());
  }, []);

  return (
    <RequestTourContext.Provider value={{ openTour }}>
      {children}
      {isOpen ? (
        <RequestTourModal property={property} onDismiss={handleDismiss} />
      ) : null}
    </RequestTourContext.Provider>
  );
}

type RequestTourButtonVariant = "primary" | "secondary" | "outline";

export function RequestTourButton({
  children = "Request a Tour",
  property,
  variant = "primary",
  className = "",
}: {
  children?: ReactNode;
  property?: TourPropertyContext;
  variant?: RequestTourButtonVariant;
  className?: string;
}) {
  const { openTour } = useRequestTour();

  return (
    <button
      type="button"
      className={`button button--${variant} ${className}`.trim()}
      onClick={(event) => openTour(property, event.currentTarget)}
    >
      <span>{children}</span>
      <svg aria-hidden="true" className="button__icon" viewBox="0 0 20 20" fill="none">
        <path d="M3 10h13M11 5l5 5-5 5" stroke="currentColor" />
      </svg>
    </button>
  );
}

export function LegacyViewingLauncher({ propertyId }: { propertyId?: string }) {
  const { openTour } = useRequestTour();
  const launchedRef = useRef(false);

  useEffect(() => {
    if (launchedRef.current) return;
    launchedRef.current = true;
    openTour(propertyId ? { propertyId } : undefined);
  }, [openTour, propertyId]);

  return null;
}
