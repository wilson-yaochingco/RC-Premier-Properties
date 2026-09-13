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
  availability?: "available" | "reserved" | "sold";
}

interface RequestTourContextValue {
  openTour: (property?: TourPropertyContext, trigger?: HTMLElement | null) => void;
  registerPageProperty: (property?: TourPropertyContext) => void;
  pageProperty?: TourPropertyContext;
}

const RequestTourContext = createContext<RequestTourContextValue | null>(null);

function propertyContextFromPage(): TourPropertyContext | undefined {
  const element = document.querySelector<HTMLElement>("[data-tour-property-context]");
  if (!element) return undefined;

  const { propertyId, title, availability } = element.dataset;
  return {
    ...(propertyId ? { propertyId } : {}),
    ...(title ? { title } : {}),
    ...(availability === "available" ||
    availability === "reserved" ||
    availability === "sold"
      ? { availability }
      : {}),
  };
}

export function useRequestTour() {
  const context = useContext(RequestTourContext);
  if (!context) {
    throw new Error("useRequestTour must be used within RequestTourProvider.");
  }
  return context;
}

export function RequestTourProvider({ children }: { children: ReactNode }) {
  const [property, setProperty] = useState<TourPropertyContext>();
  const [pageProperty, setPageProperty] = useState<TourPropertyContext>();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  const openTour = useCallback(
    (nextProperty?: TourPropertyContext, trigger?: HTMLElement | null) => {
      const resolvedProperty = nextProperty ?? propertyContextFromPage();
      if (resolvedProperty?.availability === "sold") return;
      triggerRef.current = trigger ?? null;
      setProperty(resolvedProperty);
      setIsOpen(true);
    },
    [],
  );

  const registerPageProperty = useCallback((nextProperty?: TourPropertyContext) => {
    setPageProperty(nextProperty);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    setProperty(undefined);
    const trigger = triggerRef.current;
    triggerRef.current = null;
    requestAnimationFrame(() => trigger?.focus());
  }, []);

  return (
    <RequestTourContext.Provider
      value={{ openTour, pageProperty, registerPageProperty }}
    >
      {children}
      {isOpen ? (
        <RequestTourModal property={property} onDismiss={handleDismiss} />
      ) : null}
    </RequestTourContext.Provider>
  );
}

export function PropertyTourContext({ property }: { property: TourPropertyContext }) {
  const { registerPageProperty } = useRequestTour();

  useEffect(() => {
    registerPageProperty(property);
    return () => registerPageProperty(undefined);
  }, [property, registerPageProperty]);

  return (
    <span
      hidden
      data-tour-property-context
      data-property-id={property.propertyId}
      data-title={property.title}
      data-availability={property.availability}
    />
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
  const { openTour, pageProperty } = useRequestTour();
  const resolvedProperty = property ?? pageProperty;
  const unavailable = resolvedProperty?.availability === "sold";

  return (
    <button
      type="button"
      className={`button button--${variant} ${className}`.trim()}
      onClick={(event) => openTour(property, event.currentTarget)}
      disabled={unavailable}
      title={unavailable ? "Tours are unavailable for sold properties." : undefined}
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
