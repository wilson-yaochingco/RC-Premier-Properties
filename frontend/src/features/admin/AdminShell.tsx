"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { API_PREFIX, type CurrentSessionResponse } from "@rc/shared";
import logo from "@/assets/brand/rc-premier-logo.png";
import { API_BASE_URL } from "@/lib/env";
import { ApiClientError } from "@/services/api-client";
import { getCurrentSession, logout } from "./admin.service";
import styles from "./admin.module.css";

interface AdminSessionContextValue {
  session: CurrentSessionResponse;
  expireSession(): void;
}

type AdminIconName =
  | "dashboard"
  | "properties"
  | "inquiries"
  | "viewings"
  | "search"
  | "audit"
  | "staff"
  | "create"
  | "website"
  | "signout";

interface NavigationItem {
  href: string;
  label: string;
  icon: AdminIconName;
  external?: boolean;
}

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);
const SIDEBAR_COLLAPSED_KEY = "rc-admin-sidebar-collapsed";
const SIDEBAR_COLLAPSED_EVENT = "rc-admin-sidebar-collapse-change";

function subscribeToSidebarCollapse(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_COLLAPSED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, callback);
  };
}

function getSidebarCollapseSnapshot(): boolean {
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

export function useAdminSession(): AdminSessionContextValue {
  const context = useContext(AdminSessionContext);
  if (!context) throw new Error("Admin session context is unavailable.");
  return context;
}

function signInUrl(): string {
  const query = new URLSearchParams({ returnTo: `${window.location.origin}/admin` });
  return `${API_BASE_URL}${API_PREFIX}/auth/login?${query.toString()}`;
}

function AdminIcon({ name }: { name: AdminIconName }) {
  const paths: Record<AdminIconName, ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    properties: (
      <>
        <path d="m3 11 9-7 9 7" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    inquiries: (
      <>
        <path d="M4 5h16v12H8l-4 3V5Z" />
        <path d="M8 9h8M8 13h5" />
      </>
    ),
    viewings: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18M8 14h3v3H8z" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    audit: (
      <>
        <path d="M12 3 5 6v5c0 4.6 2.8 8.3 7 10 4.2-1.7 7-5.4 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    staff: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6M15 15c3.5 0 5.5 1.7 6 5" />
      </>
    ),
    create: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M12 8v8M8 12h8" />
      </>
    ),
    website: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3.4 3 14.6 0 18M12 3c-3 3.4-3 14.6 0 18" />
      </>
    ),
    signout: (
      <>
        <path d="M10 4H5v16h5M14 8l4 4-4 4M9 12h9" />
      </>
    ),
  };
  return (
    <svg
      className={styles.navIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
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
  const collapsed = useSyncExternalStore(
    subscribeToSidebarCollapse,
    getSidebarCollapseSnapshot,
    () => false,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPathname, setDrawerPathname] = useState(pathname);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const firstDrawerLinkRef = useRef<HTMLAnchorElement>(null);
  const drawerVisible = drawerOpen && drawerPathname === pathname;

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

  useEffect(() => {
    if (!drawerVisible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstDrawerLinkRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerVisible]);

  const context = useMemo(
    () => (session ? { session, expireSession } : null),
    [expireSession, session],
  );

  const navigation = useMemo<NavigationItem[]>(() => {
    if (!session) return [];
    return [
      { href: "/admin", label: "Dashboard", icon: "dashboard" },
      { href: "/admin/properties", label: "Properties", icon: "properties" },
      { href: "/admin/inquiries", label: "Inquiries", icon: "inquiries" },
      { href: "/admin/viewings", label: "Viewings", icon: "viewings" },
      ...(session.permissions.includes("property:read-private") ||
      session.permissions.includes("inquiry:read")
        ? [{ href: "/admin/search", label: "Search", icon: "search" as const }]
        : []),
      ...(session.permissions.includes("audit:read")
        ? [{ href: "/admin/audit", label: "Audit", icon: "audit" as const }]
        : []),
      ...(session.permissions.includes("staff:manage")
        ? [{ href: "/admin/staff", label: "Staff", icon: "staff" as const }]
        : []),
      { href: "/admin/properties/new", label: "Create Draft", icon: "create" },
      { href: "/", label: "View Website", icon: "website", external: true },
    ];
  }, [session]);

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

  function closeDrawer(restoreFocus = false) {
    setDrawerOpen(false);
    if (restoreFocus)
      window.requestAnimationFrame(() => menuTriggerRef.current?.focus());
  }

  function trapDrawerFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDrawer(true);
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled])",
      ),
    );
    const first = focusable.at(0);
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  function renderNavigation(drawer = false) {
    return (
      <nav
        aria-label={
          drawer ? "Mobile administration navigation" : "Administration navigation"
        }
      >
        <ul className={styles.navList}>
          {navigation.map((item, index) => (
            <li key={item.href}>
              <Link
                ref={drawer && index === 0 ? firstDrawerLinkRef : undefined}
                href={item.href}
                aria-current={
                  !item.external && isCurrentRoute(item.href) ? "page" : undefined
                }
                aria-label={!drawer && collapsed ? item.label : undefined}
                title={!drawer && collapsed ? item.label : undefined}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                onClick={() => {
                  if (drawer) closeDrawer();
                }}
              >
                <AdminIcon name={item.icon} />
                <span>{item.label}</span>
                {item.external ? <span className={styles.externalMark}>↗</span> : null}
              </Link>
            </li>
          ))}
          <li className={styles.signOutItem}>
            <button
              type="button"
              aria-label={!drawer && collapsed ? "Sign Out" : undefined}
              title={!drawer && collapsed ? "Sign Out" : undefined}
              disabled={loggingOut}
              onClick={() => void handleLogout()}
            >
              <AdminIcon name="signout" />
              <span>{loggingOut ? "Signing out…" : "Sign Out"}</span>
            </button>
          </li>
        </ul>
      </nav>
    );
  }

  if (state === "loading") {
    return (
      <main id="main-content" tabIndex={-1} className={styles.state} aria-busy="true">
        <p className={styles.eyebrow}>Staff administration</p>
        <h1>Checking your session…</h1>
        <div className={styles.loadingRule} aria-hidden="true" />
      </main>
    );
  }

  if (state === "anonymous") {
    return (
      <main id="main-content" tabIndex={-1} className={styles.state}>
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
      <main id="main-content" tabIndex={-1} className={styles.state}>
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
      <div className={styles.admin} data-collapsed={collapsed}>
        <aside className={styles.desktopSidebar} aria-label="Staff workspace">
          <div className={styles.sidebarIdentity} role="banner">
            <span className={styles.sidebarLogo} aria-hidden="true">
              <Image src={logo} alt="" sizes="48px" />
            </span>
            <div className={styles.sidebarIdentityCopy}>
              <span>RC Premier Properties Staff</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.collapseButton}
            aria-label={
              collapsed
                ? "Expand administration sidebar"
                : "Collapse administration sidebar"
            }
            aria-expanded={!collapsed}
            onClick={() => {
              const next = !collapsed;
              window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
              window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT));
            }}
          >
            <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
          </button>
          {renderNavigation()}
          <p className={styles.signedInAs} title="Renzo & Criezel">
            <span>Signed in as</span>
            <strong>Renzo &amp; Criezel</strong>
          </p>
        </aside>

        <header className={styles.mobileHeader}>
          <span className={styles.mobileLogo} aria-hidden="true">
            <Image src={logo} alt="" sizes="42px" />
          </span>
          <div>
            <span>RC Premier Properties Staff</span>
          </div>
          <button
            ref={menuTriggerRef}
            type="button"
            aria-expanded={drawerVisible}
            aria-controls="admin-mobile-drawer"
            onClick={() => {
              setDrawerPathname(pathname);
              setDrawerOpen(true);
            }}
          >
            <span className={styles.srOnly}>Open administration menu</span>
            <span className={styles.hamburger} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </header>

        <div className={styles.shellColumn}>
          {message ? (
            <p className={styles.shellMessage} role="status">
              {message}
            </p>
          ) : null}
          <main
            id="main-content"
            tabIndex={-1}
            className={styles.shellContent}
            inert={drawerVisible ? true : undefined}
          >
            {children}
          </main>
        </div>

        {drawerVisible ? (
          <div className={styles.drawerLayer}>
            <button
              type="button"
              className={styles.drawerBackdrop}
              aria-label="Close administration menu"
              tabIndex={-1}
              onClick={() => closeDrawer(true)}
            />
            <div
              id="admin-mobile-drawer"
              className={styles.drawer}
              role="dialog"
              aria-modal="true"
              aria-label="Administration menu"
              onKeyDown={trapDrawerFocus}
            >
              <div className={styles.drawerHeader}>
                <div>
                  <span>RC Premier Properties Staff</span>
                </div>
                <button type="button" onClick={() => closeDrawer(true)}>
                  Close
                </button>
              </div>
              {renderNavigation(true)}
              <p className={styles.drawerSession}>
                Signed in as <strong>Renzo &amp; Criezel</strong>
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </AdminSessionContext.Provider>
  );
}
