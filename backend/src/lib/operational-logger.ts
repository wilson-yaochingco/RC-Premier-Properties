import { env, type LogLevel } from "../config/env.js";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface OperationalLogFields {
  requestId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  dependency?: "mongodb" | "auth0" | "email" | "media-storage" | "map";
  errorCode?: string;
  errorName?: string;
  entityType?: "inquiry" | "property" | "media-cleanup";
  entityId?: string;
  operation?: string;
  signal?: string;
  exitCode?: number;
  count?: number;
  deliveredCount?: number;
  retryPendingCount?: number;
  terminalFailureCount?: number;
  leaseConflictCount?: number;
  target?: string;
}

export interface OperationalLogger {
  debug(event: string, fields?: OperationalLogFields): void;
  info(event: string, fields?: OperationalLogFields): void;
  warn(event: string, fields?: OperationalLogFields): void;
  error(event: string, fields?: OperationalLogFields): void;
}

function boundedToken(value: unknown, fallback: string, maximum = 160): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.slice(0, maximum);
  return /^[a-zA-Z0-9._:/-]+$/.test(normalized) ? normalized : fallback;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function allowlistedFields(fields: OperationalLogFields): OperationalLogFields {
  const stringField = (
    key: keyof OperationalLogFields,
    fallback: string,
    maximum = 160,
  ) => {
    const value = fields[key];
    return value === undefined ? {} : { [key]: boundedToken(value, fallback, maximum) };
  };
  const numberField = (key: keyof OperationalLogFields) => {
    const value = finiteNumber(fields[key]);
    return value === undefined ? {} : { [key]: value };
  };

  return {
    ...stringField("requestId", "invalid_request_id", 100),
    ...stringField("route", "invalid_route", 500),
    ...stringField("method", "invalid_method", 20),
    ...numberField("statusCode"),
    ...numberField("durationMs"),
    ...stringField("dependency", "invalid_dependency", 40),
    ...stringField("errorCode", "invalid_error_code", 80),
    ...stringField("errorName", "Error", 80),
    ...stringField("entityType", "invalid_entity_type", 40),
    ...stringField("entityId", "invalid_entity_id", 100),
    ...stringField("operation", "invalid_operation", 100),
    ...stringField("signal", "invalid_signal", 20),
    ...numberField("exitCode"),
    ...numberField("count"),
    ...numberField("deliveredCount"),
    ...numberField("retryPendingCount"),
    ...numberField("terminalFailureCount"),
    ...numberField("leaseConflictCount"),
    ...stringField("target", "invalid_target", 40),
  };
}

/** Convert an unknown exception to diagnostic identity without logging its message. */
export function errorIdentity(
  error: unknown,
): Pick<OperationalLogFields, "errorName" | "errorCode"> {
  if (typeof error !== "object" || error === null) {
    return { errorName: "UnknownError", errorCode: "unknown_error" };
  }
  const candidate = error as { name?: unknown; code?: unknown };
  return {
    errorName: boundedToken(candidate.name, "Error", 80),
    ...(candidate.code !== undefined
      ? { errorCode: boundedToken(String(candidate.code), "unknown_error", 80) }
      : {}),
  };
}

export function createOperationalLogger(
  minimumLevel: LogLevel = env.LOG_LEVEL,
  write: (level: LogLevel, line: string) => void = (level, line) => {
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  },
): OperationalLogger {
  function log(level: LogLevel, event: string, fields: OperationalLogFields = {}) {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[minimumLevel]) return;
    write(
      level,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        severity: level,
        event: boundedToken(event, "invalid_event"),
        environment: env.NODE_ENV,
        ...(env.APP_BUILD_ID ? { buildId: env.APP_BUILD_ID } : {}),
        ...allowlistedFields(fields),
      }),
    );
  }

  return {
    debug: (event, fields) => log("debug", event, fields),
    info: (event, fields) => log("info", event, fields),
    warn: (event, fields) => log("warn", event, fields),
    error: (event, fields) => log("error", event, fields),
  };
}

export const operationalLogger = createOperationalLogger();
