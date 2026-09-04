"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { IS_PRODUCTION } from "@/lib/env";
import styles from "./property-map.module.css";

interface PropertyMapErrorBoundaryProps {
  children: ReactNode;
}

interface PropertyMapErrorBoundaryState {
  failed: boolean;
}

export class PropertyMapErrorBoundary extends Component<
  PropertyMapErrorBoundaryProps,
  PropertyMapErrorBoundaryState
> {
  state: PropertyMapErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): PropertyMapErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (!IS_PRODUCTION) {
      console.error("The property map failed to render.", error, info);
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className={styles.failure} role="status">
          <strong>Map temporarily unavailable.</strong>
          <p>Property search, filters, cards and links are still available.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
