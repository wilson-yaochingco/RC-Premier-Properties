import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const OPAQUE_TOKEN_BYTES = 32;

export class AuthCrypto {
  constructor(private readonly secret: string) {}

  randomToken(): string {
    return randomBytes(OPAQUE_TOKEN_BYTES).toString("base64url");
  }

  hashSession(token: string): string {
    return this.hash("session", token);
  }

  hashTransaction(token: string): string {
    return this.hash("transaction", token);
  }

  hashState(state: string): string {
    return this.hash("state", state);
  }

  csrfToken(sessionToken: string): string {
    return this.hash("csrf", sessionToken);
  }

  equals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }

  private hash(purpose: string, value: string): string {
    return createHmac("sha256", this.secret)
      .update(`rc-premier:${purpose}\0${value}`)
      .digest("base64url");
  }
}

export function isOpaqueToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}
