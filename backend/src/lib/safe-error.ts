const SENSITIVE_PARAMETER =
  /([?&](?:code|code_verifier|state|nonce|id_token|access_token|refresh_token|client_secret|csrf_token|session_token)=)[^&#\s]*/gi;
const SENSITIVE_LABEL =
  /\b(authorization(?:\s+code)?|code[_ -]?verifier|state|nonce|client[_ -]?secret|access[_ -]?token|refresh[_ -]?token|id[_ -]?token|csrf[_ -]?token|session[_ -]?(?:cookie|hash|token))\s*[:=]\s*([^\s,;]+)/gi;
const URL_CREDENTIALS = /((?:https?|mongodb(?:\+srv)?):\/\/)[^\s/@:]+:[^\s/@]+@/gi;

/**
 * Produce a bounded diagnostic message without serializing an Error object or stack.
 * Known configuration secrets and common credential-bearing URL shapes are redacted.
 */
export function safeErrorMessage(
  error: unknown,
  configuredSecrets: readonly (string | undefined)[] = [],
): string {
  const raw =
    error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error";
  let safe = raw.slice(0, 2_000);

  for (const secret of [...configuredSecrets]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.length - left.length)) {
    safe = safe.split(secret).join("[REDACTED]");
  }

  return safe
    .replace(URL_CREDENTIALS, "$1[REDACTED]@")
    .replace(SENSITIVE_PARAMETER, "$1[REDACTED]")
    .replace(SENSITIVE_LABEL, "$1=[REDACTED]");
}
