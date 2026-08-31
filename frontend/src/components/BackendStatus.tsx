"use client";

import { useEffect, useState } from "react";
import { API_PREFIX, type HealthResponse } from "@rc/shared";
import { apiUrl } from "@/lib/env";

type Status = "checking" | "online" | "offline";

/**
 * Scaffolding-only component: pings the backend health endpoint so the setup can be
 * verified end-to-end (frontend -> HTTP -> Express -> CORS). Safe to delete once real
 * pages exist. The response is typed by the shared contract, so a backend change to
 * `HealthResponse` breaks this file at compile time rather than at runtime.
 */
export default function BackendStatus() {
  const [status, setStatus] = useState<Status>("checking");
  const [detail, setDetail] = useState<string>("");

  useEffect(() => {
    const controller = new AbortController();

    fetch(apiUrl(`${API_PREFIX}/health`), { signal: controller.signal })
      .then((res) =>
        res.ok ? (res.json() as Promise<HealthResponse>) : Promise.reject(res.status),
      )
      .then((body) => {
        setStatus("online");
        setDetail(`database: ${body.database.status}`);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("offline");
        setDetail("could not reach the health endpoint");
      });

    return () => controller.abort();
  }, []);

  const label = {
    checking: "Checking backend…",
    online: "Backend reachable",
    offline: "Backend unreachable",
  }[status];

  const dot = {
    checking: "bg-amber-500",
    online: "bg-emerald-500",
    offline: "bg-red-500",
  }[status];

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`size-2.5 rounded-full ${dot}`} aria-hidden />
      <span className="font-medium">{label}</span>
      {detail && <span className="opacity-60">— {detail}</span>}
    </div>
  );
}
