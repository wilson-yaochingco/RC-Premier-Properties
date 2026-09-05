import * as oidc from "openid-client";
import type {
  OidcAuthorizationRequest,
  OidcProvider,
  VerifiedOidcIdentity,
} from "./auth.types.js";

export const MFA_ACR_VALUE =
  "http://schemas.openid.net/pape/policies/2007/06/multi-factor";

export interface OpenIdClientProviderConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  /** Test-only support for a loopback protocol fixture. Never enable for Auth0. */
  allowInsecureRequests?: boolean;
}

export class OidcVerificationError extends Error {
  constructor() {
    super("OIDC authorization response rejected.");
    this.name = "OidcVerificationError";
  }
}

export class OpenIdClientProvider implements OidcProvider {
  private configurationPromise?: Promise<oidc.Configuration>;

  constructor(private readonly settings: OpenIdClientProviderConfig) {}

  async createAuthorizationRequest(): Promise<OidcAuthorizationRequest> {
    const configuration = await this.configuration();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const authorizationUrl = oidc.buildAuthorizationUrl(configuration, {
      redirect_uri: this.settings.callbackUrl,
      scope: "openid profile email",
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      acr_values: MFA_ACR_VALUE,
    });

    return {
      authorizationUrl: authorizationUrl.href,
      state,
      nonce,
      codeVerifier,
    };
  }

  async completeAuthorization(input: {
    callbackUrl: URL;
    expectedState: string;
    expectedNonce: string;
    codeVerifier: string;
  }): Promise<VerifiedOidcIdentity> {
    try {
      const configuration = await this.configuration();
      const tokens = await oidc.authorizationCodeGrant(
        configuration,
        input.callbackUrl,
        {
          expectedState: input.expectedState,
          expectedNonce: input.expectedNonce,
          pkceCodeVerifier: input.codeVerifier,
          idTokenExpected: true,
        },
      );
      const claims = tokens.claims();

      if (
        !claims ||
        claims.iss !== this.settings.issuerUrl ||
        typeof claims.sub !== "string" ||
        claims.sub.length === 0
      ) {
        throw new OidcVerificationError();
      }

      const authenticationMethods = Array.isArray(claims.amr)
        ? claims.amr.filter((method): method is string => typeof method === "string")
        : [];

      return {
        issuer: claims.iss,
        subject: claims.sub,
        authenticationMethods,
        ...(typeof claims.name === "string" ? { displayName: claims.name } : {}),
        ...(typeof claims.email === "string" ? { email: claims.email } : {}),
      };
    } catch {
      throw new OidcVerificationError();
    }
  }

  private configuration(): Promise<oidc.Configuration> {
    const configurationExtensions = this.settings.allowInsecureRequests
      ? [oidc.allowInsecureRequests, oidc.enableNonRepudiationChecks]
      : [oidc.enableNonRepudiationChecks];
    this.configurationPromise ??= oidc
      .discovery(
        new URL(this.settings.issuerUrl),
        this.settings.clientId,
        { client_secret: this.settings.clientSecret },
        oidc.ClientSecretPost(this.settings.clientSecret),
        { execute: configurationExtensions, timeout: 10 },
      )
      .then((configuration) => {
        return configuration;
      })
      .catch((error: unknown) => {
        this.configurationPromise = undefined;
        throw error;
      });
    return this.configurationPromise;
  }
}
