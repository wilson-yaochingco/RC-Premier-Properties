import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { generateKeyPairSync, sign } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  MFA_ACR_VALUE,
  OidcVerificationError,
  OpenIdClientProvider,
} from "../src/modules/auth/auth.oidc.js";

const CLIENT_ID = "oidc-protocol-test-client";
const CLIENT_SECRET = "oidc-protocol-test-secret";
const CALLBACK_URL = "http://localhost:5000/api/v1/auth/callback";
const EXPECTED_STATE = "deterministic-state";
const EXPECTED_NONCE = "deterministic-nonce";
const CODE_VERIFIER = "deterministic-code-verifier-for-pkce-check-123456789";

const signingKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const attackerKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = signingKeys.publicKey.export({ format: "jwk" });

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function idToken(
  issuer: string,
  code: string,
  privateKey = signingKeys.privateKey,
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: "RS256", kid: "fixture-key", typ: "JWT" });
  const claims: Record<string, unknown> = {
    iss: code === "wrong-issuer" ? "https://attacker.invalid/" : issuer,
    sub: "auth0|protocol-test-admin",
    aud: code === "wrong-audience" ? "different-client" : CLIENT_ID,
    iat: now - 5,
    exp: code === "expired" ? now - 300 : now + 300,
    nonce: code === "wrong-nonce" ? "different-nonce" : EXPECTED_NONCE,
    name: "Protocol Test Admin",
    email: "protocol-admin@example.test",
  };
  if (code !== "missing-amr") {
    claims.amr =
      code === "empty-amr" ? [] : code === "passkey-only" ? ["phr"] : ["mfa"];
  }
  const payload = encode(claims);
  const unsigned = `${header}.${payload}`;
  const signature = sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString(
    "base64url",
  );
  return `${unsigned}.${signature}`;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function json(res: ServerResponse, status: number, body: object): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

describe("openid-client protocol boundary", () => {
  let issuer = "";
  let provider: OpenIdClientProvider;
  const server = createServer(async (req, res) => {
    if (req.url === "/.well-known/openid-configuration") {
      json(res, 200, {
        issuer,
        authorization_endpoint: `${issuer}authorize`,
        token_endpoint: `${issuer}token`,
        jwks_uri: `${issuer}jwks`,
        response_types_supported: ["code"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
        token_endpoint_auth_methods_supported: ["client_secret_post"],
        code_challenge_methods_supported: ["S256"],
      });
      return;
    }
    if (req.url === "/jwks") {
      json(res, 200, {
        keys: [{ ...publicJwk, kid: "fixture-key", use: "sig", alg: "RS256" }],
      });
      return;
    }
    if (req.url === "/token" && req.method === "POST") {
      const parameters = new URLSearchParams(await readBody(req));
      const code = parameters.get("code") ?? "";
      if (
        parameters.get("client_id") !== CLIENT_ID ||
        parameters.get("client_secret") !== CLIENT_SECRET ||
        parameters.get("redirect_uri") !== CALLBACK_URL ||
        parameters.get("code_verifier") !== CODE_VERIFIER
      ) {
        json(res, 400, { error: "invalid_grant" });
        return;
      }
      json(res, 200, {
        access_token: "fixture-access-token",
        token_type: "Bearer",
        expires_in: 300,
        id_token: idToken(
          issuer,
          code,
          code === "bad-signature" ? attackerKeys.privateKey : signingKeys.privateKey,
        ),
      });
      return;
    }
    res.writeHead(404).end();
  });

  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing server port");
    issuer = `http://127.0.0.1:${address.port}/`;
    provider = new OpenIdClientProvider({
      issuerUrl: issuer,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      callbackUrl: CALLBACK_URL,
      allowInsecureRequests: true,
    });
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it("builds an authorization URL with state, nonce, and S256 PKCE", async () => {
    const authorization = await provider.createAuthorizationRequest();
    const url = new URL(authorization.authorizationUrl);

    expect(url.origin).toBe(new URL(issuer).origin);
    expect(url.pathname).toBe("/authorize");
    expect(url.searchParams.get("redirect_uri")).toBe(CALLBACK_URL);
    expect(url.searchParams.get("scope")).toBe("openid profile email");
    expect(url.searchParams.get("state")).toBe(authorization.state);
    expect(url.searchParams.get("nonce")).toBe(authorization.nonce);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("acr_values")).toBe(MFA_ACR_VALUE);
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(authorization.codeVerifier).not.toBe(url.searchParams.get("code_challenge"));
  });

  it("accepts a correctly signed code response without exposing provider tokens", async () => {
    const identity = await provider.completeAuthorization({
      callbackUrl: new URL(
        `${CALLBACK_URL}?code=valid&state=${encodeURIComponent(EXPECTED_STATE)}`,
      ),
      expectedState: EXPECTED_STATE,
      expectedNonce: EXPECTED_NONCE,
      codeVerifier: CODE_VERIFIER,
    });

    expect(identity).toEqual({
      issuer,
      subject: "auth0|protocol-test-admin",
      authenticationMethods: ["mfa"],
      displayName: "Protocol Test Admin",
      email: "protocol-admin@example.test",
    });
    expect(identity).not.toHaveProperty("id_token");
    expect(identity).not.toHaveProperty("access_token");
  });

  it.each([
    ["missing amr", "missing-amr", []],
    ["empty amr", "empty-amr", []],
    ["passkey-only amr", "passkey-only", ["phr"]],
  ])(
    "returns validated %s evidence for the service to enforce",
    async (_label, code, amr) => {
      const identity = await provider.completeAuthorization({
        callbackUrl: new URL(
          `${CALLBACK_URL}?code=${code}&state=${encodeURIComponent(EXPECTED_STATE)}`,
        ),
        expectedState: EXPECTED_STATE,
        expectedNonce: EXPECTED_NONCE,
        codeVerifier: CODE_VERIFIER,
      });

      expect(identity.authenticationMethods).toEqual(amr);
    },
  );

  it.each([
    ["wrong issuer", "wrong-issuer", EXPECTED_STATE, EXPECTED_NONCE, CODE_VERIFIER],
    ["wrong audience", "wrong-audience", EXPECTED_STATE, EXPECTED_NONCE, CODE_VERIFIER],
    ["bad signature", "bad-signature", EXPECTED_STATE, EXPECTED_NONCE, CODE_VERIFIER],
    ["expired token", "expired", EXPECTED_STATE, EXPECTED_NONCE, CODE_VERIFIER],
    ["wrong state", "valid", "wrong-state", EXPECTED_NONCE, CODE_VERIFIER],
    ["wrong nonce", "wrong-nonce", EXPECTED_STATE, EXPECTED_NONCE, CODE_VERIFIER],
    ["wrong PKCE verifier", "valid", EXPECTED_STATE, EXPECTED_NONCE, "wrong-verifier"],
  ])("rejects %s", async (_label, code, callbackState, expectedNonce, codeVerifier) => {
    await expect(
      provider.completeAuthorization({
        callbackUrl: new URL(
          `${CALLBACK_URL}?code=${code}&state=${encodeURIComponent(callbackState)}`,
        ),
        expectedState: EXPECTED_STATE,
        expectedNonce,
        codeVerifier,
      }),
    ).rejects.toBeInstanceOf(OidcVerificationError);
  });
});
