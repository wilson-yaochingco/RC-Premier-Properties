import type { AuthPermission, StaffRole } from "@rc/shared";

const ADMIN_PERMISSIONS: readonly AuthPermission[] = Object.freeze([
  "property:read-private",
  "property:write",
  "property:publish",
  "property:change-availability",
  "inquiry:read",
  "inquiry:update",
  "audit:read",
]);

export const ROLE_PERMISSIONS: Readonly<Record<StaffRole, readonly AuthPermission[]>> =
  Object.freeze({
    admin: ADMIN_PERMISSIONS,
  });

export const CSRF_HEADER_NAME = "x-csrf-token";
export const SESSION_COOKIE_DEVELOPMENT = "rc_session";
export const SESSION_COOKIE_PRODUCTION = "__Host-rc_session";
export const TRANSACTION_COOKIE_DEVELOPMENT = "rc_oidc_transaction";
export const TRANSACTION_COOKIE_PRODUCTION = "__Host-rc_oidc_transaction";
