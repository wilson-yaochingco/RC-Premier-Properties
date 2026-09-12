import { Router, type RequestHandler } from "express";
import { env } from "../../config/env.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { createLoginRateLimit } from "../../middleware/loginRateLimit.js";
import { createCallbackFailureRateLimit } from "../../middleware/callbackFailureRateLimit.js";
import { AuthCrypto } from "./auth.crypto.js";
import { createAuthController } from "./auth.controller.js";
import { createAuthCookieSettings, type AuthCookieSettings } from "./auth.cookies.js";
import {
  noStore,
  optionalAuthenticationForLogout,
  requireAllowedOrigin,
  requireAuthentication,
  requireCsrf,
} from "./auth.middleware.js";
import { OpenIdClientProvider } from "./auth.oidc.js";
import { AuthService } from "./auth.service.js";
import { mongooseAuthStore } from "./auth.store.js";

export interface AuthRouteDependencies {
  service?: AuthService;
  cookies?: AuthCookieSettings;
  loginRateLimit?: RequestHandler;
  callbackFailureRateLimit?: RequestHandler;
}

export interface ResolvedAuthRouteDependencies {
  service: AuthService | null;
  cookies?: AuthCookieSettings;
  loginRateLimit: RequestHandler;
  callbackFailureRateLimit: RequestHandler;
}

function defaultAuthService(): AuthService | null {
  const auth = env.AUTH;
  if (!auth) return null;

  return new AuthService(
    mongooseAuthStore,
    new OpenIdClientProvider({
      issuerUrl: auth.issuerUrl,
      clientId: auth.clientId,
      clientSecret: auth.clientSecret,
      callbackUrl: auth.callbackUrl,
    }),
    new AuthCrypto(auth.sessionHashSecret),
    {
      issuerUrl: auth.issuerUrl,
      callbackUrl: auth.callbackUrl,
      allowedReturnUrls: auth.allowedReturnUrls,
      allowedOrigins: [env.CORS_ORIGIN],
      requiredAmr: auth.requiredAmr,
      sessionIdleMs: auth.sessionIdleMinutes * 60_000,
      sessionAbsoluteMs: auth.sessionAbsoluteHours * 60 * 60_000,
      sessionActivityTouchMs: 5 * 60_000,
      maxConcurrentSessions: auth.maxConcurrentSessions,
      transactionLifetimeMs: auth.transactionMinutes * 60_000,
    },
  );
}

export function resolveAuthRouteDependencies(
  dependencies: AuthRouteDependencies = {},
): ResolvedAuthRouteDependencies {
  const service = dependencies.service ?? defaultAuthService();
  const loginRateLimit = dependencies.loginRateLimit ?? createLoginRateLimit();
  const callbackFailureRateLimit =
    dependencies.callbackFailureRateLimit ?? createCallbackFailureRateLimit();
  if (!service) return { service: null, loginRateLimit, callbackFailureRateLimit };
  const cookies =
    dependencies.cookies ??
    createAuthCookieSettings(
      env.IS_PRODUCTION,
      service.config.sessionAbsoluteMs,
      service.config.transactionLifetimeMs,
    );
  return { service, cookies, loginRateLimit, callbackFailureRateLimit };
}

export function createAuthRoutes(
  dependencies: AuthRouteDependencies = {},
  resolved: ResolvedAuthRouteDependencies = resolveAuthRouteDependencies(dependencies),
): Router {
  const router = Router();
  router.use(noStore());

  const { service } = resolved;
  if (!service) {
    router.use((_req, _res, next) => {
      next(new HttpError(503, "Authentication is not configured."));
    });
    return router;
  }

  const cookies = resolved.cookies;
  if (!cookies) throw new Error("Resolved authentication cookies are missing.");
  const controller = createAuthController(service, cookies);

  router.get("/login", resolved.loginRateLimit, controller.start);
  router.get("/callback", resolved.callbackFailureRateLimit, controller.callback);
  router.get("/session", requireAuthentication(service, cookies), controller.current);
  router.post(
    "/logout",
    optionalAuthenticationForLogout(service, cookies),
    requireAllowedOrigin(service),
    requireCsrf(service, { allowAnonymous: true }),
    controller.logout,
  );

  return router;
}

export default createAuthRoutes();
