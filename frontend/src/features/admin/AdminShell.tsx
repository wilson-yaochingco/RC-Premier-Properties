"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { API_PREFIX, type CurrentSessionResponse } from "@rc/shared";
import { API_BASE_URL } from "@/lib/env";
import { ApiClientError } from "@/services/api-client";
import { getCurrentSession, logout } from "./admin.service";
import styles from "./admin.module.css";

interface AdminSessionContextValue {
  session: CurrentSessionResponse;
  expireSession(): void;
}

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export function useAdminSession(): AdminSessionContextValue {
  const context = useContext(AdminSessionContext);
  if (!context) throw new Error("Admin session context is unavailable.");
  return context;
}

function signInUrl(): string {
  const query = new URLSearchParams({ returnTo: `${window.location.origin}/admin` });
  return `${API_BASE_URL}${API_PREFIX}/auth/login?${query.toString()}`;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<CurrentSessionResponse | null>(null);
  const [state, setState] = useState<
    "loading" | "authenticated" | "anonymous" | "error"
  >("loading");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  const expireSession = useCallback(() => {
    setSession(null);
    setMessage("Your staff session has expired. Sign in again to continue.");
    setState("anonymous");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getCurrentSession(controller.signal)
      .then((current) => {
        setSession(current);
        setState("authenticated");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiClientError && error.statusCode === 401) {
          setMessage("Sign in with your approved staff account to continue.");
          setState("anonymous");
          return;
        }
        setMessage(
          error instanceof ApiClientError
            ? error.message
            : "The staff session could not be checked.",
        );
        setState("error");
      });
    return () => controller.abort();
  }, [attempt]);

  const context = useMemo(
    () => (session ? { session, expireSession } : null),
    [expireSession, session],
  );

  async function handleLogout() {
    if (!session) return;
    setLoggingOut(true);
    try {
      await logout(session.csrfToken);
      setSession(null);
      setMessage("You have signed out of the RC Premier staff session.");
      setState("anonymous");
    } catch (error) {
      if (error instanceof ApiClientError && error.statusCode === 401) {
        expireSession();
      } else {
        setMessage(
          error instanceof ApiClientError
            ? error.message
            : "Sign out failed. Try again.",
        );
      }
    } finally {
      setLoggingOut(false);
    }
  }

  function isCurrentRoute(href: string): boolean {
    if (href === "/admin") return pathname === href;
    if (href === "/admin/properties/new") return pathname === href;
    if (href === "/admin/properties") {
      return pathname.startsWith(href) && pathname !== "/admin/properties/new";
    }
    return pathname.startsWith(href);
  }

  if (state === "loading") {
    return (
      <main id="main-content" className={styles.state} aria-busy="true">
        <p className={styles.eyebrow}>Staff administration</p>
        <h1>Checking your session…</h1>
        <div className={styles.loadingRule} aria-hidden="true" />
      </main>
    );
  }

  if (state === "anonymous") {
    return (
      <main id="main-content" className={styles.state}>
        <p className={styles.eyebrow}>Protected staff area</p>
        <h1>Staff sign-in required.</h1>
        <p>{message}</p>
        <a className={styles.primaryAction} href={signInUrl()}>
          Sign in with Auth0
        </a>
      </main>
    );
  }

  if (state === "error" || !context) {
    return (
      <main id="main-content" className={styles.state}>
        <p className={styles.eyebrow}>Staff administration</p>
        <h1>We could not check your session.</h1>
        <p role="alert">{message}</p>
        <button
          className={styles.primaryAction}
          onClick={() => {
            setState("loading");
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </button>
      </main>
    );
  }

  return (
    <AdminSessionContext.Provider value={context}>
      <div className={styles.admin}>
        <header className={styles.shellHeader}>
          <div>
            <p className={styles.eyebrow}>RC Premier staff</p>
            <p className={styles.staffName}>{context.session.staff.displayName}</p>
          </div>
          <nav aria-label="Administration navigation">
            <Link
              href="/admin"
              aria-current={isCurrentRoute("/admin") ? "page" : undefined}
            >
              Dashboard
            </Link>
            <Link
              href="/admin/properties"
              aria-current={isCurrentRoute("/admin/properties") ? "page" : undefined}
            >
              Properties
            </Link>
            <Link
              href="/admin/inquiries"
              aria-current={isCurrentRoute("/admin/inquiries") ? "page" : undefined}
            >
              Inquiries
            </Link>
            <Link
              href="/admin/viewings"
              aria-current={isCurrentRoute("/admin/viewings") ? "page" : undefined}
            >
              Viewings
            </Link>
            <Link
              href="/admin/properties/new"
              aria-current={
                isCurrentRoute("/admin/properties/new") ? "page" : undefined
              }
            >
              Create draft
            </Link>
            <Link href="/" className={styles.viewWebsite}>
              View Website
            </Link>
          </nav>
          <button type="button" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </header>
        {message && state === "authenticated" ? (
          <p className={styles.shellMessage} role="status">
            {message}
          </p>
        ) : null}
        <main id="main-content" tabIndex={-1} className={styles.shellContent}>
          {children}
        </main>
      </div>
    </AdminSessionContext.Provider>
  );
}
