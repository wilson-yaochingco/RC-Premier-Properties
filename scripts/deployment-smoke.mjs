const API_PREFIX = "/api/v1";

function requiredOrigin(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);

  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${name} must be one exact HTTPS origin.`);
  }
  return url.origin;
}

async function responseAt(origin, path, init) {
  const response = await fetch(`${origin}${path}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    ...init,
  });
  return response;
}

async function expectStatus(origin, path, expected, init) {
  const response = await responseAt(origin, path, init);
  if (response.status !== expected) {
    throw new Error(`${path} returned ${response.status}; expected ${expected}.`);
  }
  return response;
}

async function main() {
  const frontendOrigin = requiredOrigin("SMOKE_FRONTEND_ORIGIN");
  const apiOrigin = requiredOrigin("SMOKE_API_ORIGIN");

  const [home, adminPage] = await Promise.all([
    expectStatus(frontendOrigin, "/", 200),
    expectStatus(frontendOrigin, "/admin", 200),
    expectStatus(frontendOrigin, "/properties", 200),
    expectStatus(frontendOrigin, "/robots.txt", 200),
    expectStatus(frontendOrigin, "/sitemap.xml", 200),
    expectStatus(apiOrigin, `${API_PREFIX}/health`, 200),
    expectStatus(apiOrigin, `${API_PREFIX}/health/ready`, 200),
    expectStatus(apiOrigin, `${API_PREFIX}/properties`, 200),
    expectStatus(apiOrigin, `${API_PREFIX}/admin/properties`, 401),
  ]);

  const contentSecurityPolicy = home.headers.get("content-security-policy") ?? "";
  if (
    !contentSecurityPolicy.includes("default-src 'self'") ||
    contentSecurityPolicy.includes("unsafe-eval")
  ) {
    throw new Error("Frontend Content-Security-Policy is missing or unsafe.");
  }
  if (!home.headers.has("strict-transport-security")) {
    throw new Error("Frontend HSTS header is missing.");
  }
  if (!adminPage.headers.get("cache-control")?.includes("no-store")) {
    throw new Error("Admin frontend response is not marked no-store.");
  }
  if (!adminPage.headers.get("x-robots-tag")?.includes("noindex")) {
    throw new Error("Admin frontend response is not marked noindex.");
  }

  const allowedCors = await expectStatus(apiOrigin, `${API_PREFIX}/properties`, 200, {
    headers: { Origin: frontendOrigin },
  });
  if (allowedCors.headers.get("access-control-allow-origin") !== frontendOrigin) {
    throw new Error("API did not return the exact configured CORS origin.");
  }

  const hostileCors = await expectStatus(apiOrigin, `${API_PREFIX}/properties`, 200, {
    headers: { Origin: "https://hostile.invalid" },
  });
  if (hostileCors.headers.has("access-control-allow-origin")) {
    throw new Error("API reflected an unapproved CORS origin.");
  }

  console.log("Deployment smoke checks passed.");
}

main().catch((error) => {
  console.error(
    "Deployment smoke checks failed:",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exitCode = 1;
});
