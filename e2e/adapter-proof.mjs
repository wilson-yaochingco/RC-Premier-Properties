/** Isolated Phase 2 gate: placeholders only, never reads a real backend .env. */
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { createServer, request as httpRequest } from "node:http";
import { createServer as createHttpsServer, request as httpsRequest } from "node:https";
import {
  mkdtemp,
  readFile,
  writeFile,
  rm,
  copyFile,
  symlink,
  cp,
} from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { tmpdir, networkInterfaces, hostname } from "node:os";
import path from "node:path";
import { API_PREFIX } from "@rc/shared";

const root = path.resolve(import.meta.dirname, "..");
const mode = process.argv[2] ?? "reachable";
const port = 3200;
const base = `http://127.0.0.1:${port}`;
const placeholderOrigin = "https://adapter.example.test";
const env = {
  ...process.env,
  NODE_ENV: mode === "dev" ? "development" : "production",
  NEXT_PUBLIC_DEPLOYMENT_ENV: "test",
  NEXT_PUBLIC_API_URL: base,
  NEXT_PUBLIC_SITE_URL: base,
  CORS_ORIGIN: placeholderOrigin,
  API_PUBLIC_ORIGIN: placeholderOrigin,
  MONGODB_URI: "mongodb://adapter.invalid:27017/rc_premier?tls=true",
  TRUST_PROXY_HOPS: "0",
  AUTH0_ISSUER_URL: "https://adapter-placeholder.auth0.com/",
  AUTH0_CLIENT_ID: "adapter-placeholder-client",
  AUTH0_CLIENT_SECRET: "adapter-placeholder-secret",
  AUTH0_CALLBACK_URL: `${placeholderOrigin}${API_PREFIX}/auth/callback`,
  AUTH_ALLOWED_RETURN_URLS: `${placeholderOrigin}/,${placeholderOrigin}/admin`,
  AUTH_SESSION_HASH_SECRET: "adapter-test-only-session-hash-secret-0123456789",
  AUTH_REQUIRED_AMR: "mfa",
  CLOUDINARY_CLOUD_NAME: "",
  CLOUDINARY_API_KEY: "",
  CLOUDINARY_API_SECRET: "",
  MEDIA_PUBLIC_ORIGIN: "",
  BUSINESS_NOTIFICATION_EMAIL: "adapter@example.test",
  LOG_LEVEL: "error",
};
const children = [];
let mongo, proxy, directory, databaseClient, devDirectory, sessionToken;

function launch(args, cwd = root) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: "inherit" });
  children.push(child);
  return child;
}
async function run(args, cwd) {
  const child = launch(args, cwd);
  const [code] = await once(child, "exit");
  assert.equal(code, 0, `Command failed: node ${args.join(" ")}`);
}
async function listen(server, host, number = 0) {
  server.listen(number, host);
  await once(server, "listening");
  return server.address().port;
}
async function close(server) {
  if (!server) return;
  server.closeAllConnections?.();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
function get(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = (url.startsWith("https:") ? httpsRequest : httpRequest)(
      url,
      options,
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body,
          }),
        );
      },
    );
    request.on("error", reject);
    request.setTimeout(30_000, () =>
      request.destroy(new Error("Proof request timed out")),
    );
    request.end(options.body);
  });
}
async function probe(origin, route, status, options) {
  const response = await get(`${origin}${API_PREFIX}${route}`, options);
  console.log(
    `${options?.method ?? "GET"} ${route}: HTTP/1.1 ${response.status} ${response.statusMessage}\n${response.body}`,
  );
  assert.equal(response.status, status, route);
  return JSON.parse(response.body);
}
async function ready() {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (children.at(-1)?.exitCode != null)
      throw new Error("Next exited before readiness");
    try {
      if ((await get(`${base}${API_PREFIX}/health`)).status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Next did not become ready");
}

try {
  assert(["unreachable", "reachable", "dev"].includes(mode));
  let origin = base;
  let ca;
  if (mode !== "unreachable") {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const { MongoClient } = await import("mongodb");
    const { AuthCrypto } = await import("../backend/dist/modules/auth/auth.crypto.js");
    const address = Object.values(networkInterfaces())
      .flat()
      .find((item) => item?.family === "IPv4" && !item.internal)?.address;
    assert(address, "A non-loopback local IPv4 address is required");
    directory = await mkdtemp(path.join(tmpdir(), "rc-adapter-"));
    const openssl =
      process.platform === "win32"
        ? "C:/Program Files/Git/mingw64/bin/openssl.exe"
        : "openssl";
    const cert = (name) => path.join(directory, name);
    function ssl(...args) {
      execFileSync(openssl, args, { stdio: "pipe" });
    }
    ssl(
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      cert("ca.key"),
      "-out",
      cert("ca.crt"),
      "-days",
      "1",
      "-subj",
      "/CN=RC adapter test CA",
    );
    ssl(
      "req",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      cert("server.key"),
      "-out",
      cert("server.csr"),
      "-subj",
      `/CN=${hostname()}`,
    );
    await writeFile(
      cert("extensions.cnf"),
      `subjectAltName=DNS:${hostname()},IP:${address}\nextendedKeyUsage=serverAuth,clientAuth\n`,
    );
    ssl(
      "x509",
      "-req",
      "-in",
      cert("server.csr"),
      "-CA",
      cert("ca.crt"),
      "-CAkey",
      cert("ca.key"),
      "-CAcreateserial",
      "-out",
      cert("server.crt"),
      "-days",
      "1",
      "-extfile",
      cert("extensions.cnf"),
    );
    ca = await readFile(cert("ca.crt"));
    const key = await readFile(cert("server.key"));
    const certificate = await readFile(cert("server.crt"));
    await writeFile(cert("server.pem"), Buffer.concat([key, certificate]));
    mongo = await MongoMemoryServer.create({
      instance: {
        ip: address,
        dbName: "rc_premier",
        args: [
          "--tlsMode",
          "requireTLS",
          "--tlsCertificateKeyFile",
          cert("server.pem"),
          "--tlsCAFile",
          cert("ca.crt"),
          "--tlsAllowConnectionsWithoutCertificates",
        ],
      },
    });
    env.MONGODB_URI = `${mongo.getUri("rc_premier", address)}?tls=true&tlsCAFile=${encodeURIComponent(cert("ca.crt"))}&directConnection=true`;
    env.NODE_EXTRA_CA_CERTS = cert("ca.crt");
    databaseClient = new MongoClient(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    await databaseClient.connect();
    const { RC_PREMIER_LISTINGS } =
      await import("../backend/dist/scripts/rc-premier-listings.js");
    const listing = RC_PREMIER_LISTINGS.find((item) => item.content)?.content;
    assert(listing);
    await databaseClient
      .db("rc_premier")
      .collection("properties")
      .insertOne({
        ...listing,
        publicationStatus: "published",
        featured: true,
        gallery: [],
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    const crypto = new AuthCrypto(env.AUTH_SESSION_HASH_SECRET);
    sessionToken = crypto.randomToken();
    const now = new Date();
    const expiry = new Date(now.getTime() + 3_600_000);
    const staff = await databaseClient
      .db("rc_premier")
      .collection("staffidentities")
      .insertOne({
        issuer: env.AUTH0_ISSUER_URL,
        subject: "adapter-fixture",
        displayName: "Adapter fixture",
        email: "adapter@example.test",
        role: "admin",
        status: "active",
        authorizationVersion: 1,
        createdAt: now,
        updatedAt: now,
      });
    await databaseClient
      .db("rc_premier")
      .collection("authsessions")
      .insertOne({
        sessionHash: crypto.hashSession(sessionToken),
        staffIdentity: staff.insertedId,
        staffAuthorizationVersion: 1,
        createdAt: now,
        lastActivityAt: now,
        idleExpiresAt: expiry,
        absoluteExpiresAt: expiry,
        expiresAt: expiry,
      });
    proxy = createHttpsServer({ key, cert: certificate }, (req, res) => {
      const upstream = httpRequest(
        `${base}${req.url}`,
        { method: req.method, headers: req.headers },
        (reply) => {
          res.writeHead(reply.statusCode, reply.headers);
          reply.pipe(res);
        },
      );
      upstream.on("error", (error) => res.destroy(error));
      req.pipe(upstream);
    });
    const tlsPort = await listen(proxy, address);
    origin = `https://${address}:${tlsPort}`;
    env.NEXT_PUBLIC_API_URL = origin;
    env.NEXT_PUBLIC_SITE_URL = origin;
    env.CORS_ORIGIN = origin;
    env.API_PUBLIC_ORIGIN = origin;
    env.AUTH0_CALLBACK_URL = `${origin}${API_PREFIX}/auth/callback`;
    env.AUTH_ALLOWED_RETURN_URLS = `${origin}/,${origin}/admin`;
  } else {
    env.NEXT_PUBLIC_DEPLOYMENT_ENV = "production";
    env.NEXT_PUBLIC_API_URL = placeholderOrigin;
    env.NEXT_PUBLIC_SITE_URL = placeholderOrigin;
    env.NEXT_PUBLIC_MAP_TILE_URL = "https://tiles.example.test/{z}/{x}/{y}.png";
    env.NEXT_PUBLIC_MAP_ATTRIBUTION_TEXT = "Adapter test tiles";
    env.NEXT_PUBLIC_MAP_ATTRIBUTION_URL = "https://tiles.example.test/copyright";
  }
  const nextBin = path.join(root, "node_modules/next/dist/bin/next");
  if (mode !== "dev") {
    await run([nextBin, "build"], path.join(root, "frontend"));
    const trace = JSON.parse(
      await readFile(
        path.join(root, "frontend/.next/server/pages/api/v1/[...path].js.nft.json"),
        "utf8",
      ),
    );
    const backendFiles = trace.files.filter((file) => file.includes("backend/dist/"));
    assert(
      backendFiles.some((file) => file.endsWith("serverless.js")),
      "Backend absent from traced function",
    );
    console.log("TRACE backend/dist:", JSON.stringify(backendFiles));
    for (const required of [
      "shared/dist/api.js",
      "node_modules/express/package.json",
      "node_modules/mongoose/package.json",
      "node_modules/openid-client/package.json",
      "node_modules/cloudinary/package.json",
      "node_modules/sharp/package.json",
      "node_modules/@vercel/functions/package.json",
    ]) {
      assert(
        trace.files.some((file) => file.endsWith(required)),
        `Trace missing ${required}`,
      );
      console.log("TRACE dependency:", required);
    }
    assert(
      !trace.files.some((file) => /\/\.env[^/]*$/.test(file)),
      "Environment file leaked into trace",
    );
  }
  let frontendDirectory = path.join(root, "frontend");
  if (mode === "dev") {
    // An isolated project avoids the owner's active frontend/.next/dev lock.
    devDirectory = await mkdtemp(path.join(root, "adapter-proof-dev-"));
    await cp(path.join(root, "frontend/src"), path.join(devDirectory, "src"), {
      recursive: true,
    });
    await symlink(
      path.join(root, "frontend/public"),
      path.join(devDirectory, "public"),
      "junction",
    );
    for (const name of ["package.json", "tsconfig.json", "postcss.config.mjs"])
      await copyFile(path.join(root, "frontend", name), path.join(devDirectory, name));
    await writeFile(
      path.join(devDirectory, "next.config.mjs"),
      `export { default } from ${JSON.stringify(pathToFileURL(path.join(root, "frontend/next.config.mjs")).href)};\n`,
    );
    frontendDirectory = devDirectory;
  }
  launch(
    [nextBin, mode === "dev" ? "dev" : "start", "-p", String(port), "-H", "127.0.0.1"],
    frontendDirectory,
  );
  await ready();
  const options = ca ? { ca } : {};
  await probe(origin, "/health", 200, options);
  if (mode === "unreachable") {
    await probe(origin, "/health/ready", 503, options);
    for (const route of ["/x", "/admin/properties"]) {
      const body = await probe(origin, route, 503, options);
      assert.deepEqual(body, {
        status: "error",
        statusCode: 503,
        message: "Internal Server Error",
      });
    }
  } else {
    const listings = await probe(origin, "/properties?page=1&limit=6", 200, options);
    assert.equal(listings.items.length, 1);
    await probe(origin, `/properties/${listings.items[0].slug}`, 200, options);
    await probe(origin, "/properties/facets", 200, options);
    await probe(origin, "/properties/map", 200, options);
    await probe(origin, "/inquiries", 201, {
      ...options,
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({
        name: "Adapter fixture",
        email: "adapter@example.test",
        phone: "+639171234567",
        inquiryType: "general",
        source: "contact-page",
        message: "Adapter proof inquiry, test data only.",
        privacyConsent: true,
      }),
    });
    assert.equal(
      await databaseClient.db("rc_premier").collection("inquiries").countDocuments(),
      1,
    );
    await probe(origin, "/health/ready", 200, options);
    await probe(origin, "/admin/properties", 401, options);
    await probe(origin, "/x", 404, options);
    const csrf = await probe(origin, "/admin/properties", 403, {
      ...options,
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: `${mode === "dev" ? "rc_session" : "__Host-rc_session"}=${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(csrf.message, "CSRF validation failed.");
    assert.equal(
      await databaseClient.db("rc_premier").collection("properties").countDocuments(),
      1,
    );
    await probe(origin, "/inquiries", 400, {
      ...options,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    await probe(origin, "/auth/logout", 403, {
      ...options,
      method: "POST",
      headers: { Origin: "https://disallowed.example.test" },
    });
    for (const route of ["/properties", `/properties/${listings.items[0].slug}`]) {
      const page = await get(`${origin}${route}`, options);
      assert.equal(page.status, 200);
      assert(
        page.body.includes(listings.items[0].title),
        `Listing missing from ${route}`,
      );
      console.log(
        `PAGE ${route}: HTTP/1.1 ${page.status} ${page.statusMessage}; listing rendered`,
      );
    }
    const admin = await get(`${origin}/admin`, options);
    assert.equal(admin.status, 200);
    console.log(
      "Admin sign-in target:",
      `${origin}${API_PREFIX}/auth/login?returnTo=${encodeURIComponent(`${origin}/admin`)}`,
    );
    console.log(
      "REQUIRES OWNER MANUAL VERIFICATION: MFA login, session, CSRF-protected write, logout.",
    );
  }
  // Compare the same real Express application in a separate process, without Next page headers.
  launch([
    "--input-type=module",
    "-e",
    `import { createServer } from 'node:http'; import { createApp } from './backend/dist/app.js'; createServer(createApp()).listen(5200, '127.0.0.1');`,
  ]);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const direct = await get(`http://127.0.0.1:5200${API_PREFIX}/health`);
  const adapter = await get(`${origin}${API_PREFIX}/health`, options);
  const security = (headers) =>
    Object.fromEntries(
      Object.entries(headers).filter(([name]) =>
        /^(content-security-policy|cross-origin-|origin-agent-cluster|permissions-policy|referrer-policy|strict-transport-security|x-(content-type|dns-prefetch|download|frame|permitted|robots|xss))/.test(
          name,
        ),
      ),
    );
  console.log("HEADERS Express:", JSON.stringify(security(direct.headers)));
  console.log("HEADERS adapter:", JSON.stringify(security(adapter.headers)));
  assert.deepEqual(
    security(adapter.headers),
    security(direct.headers),
    "Security header divergence",
  );
  console.log(`PASS adapter gate: ${mode}`);
} finally {
  for (const child of children.reverse()) {
    if (child.exitCode === null && child.signalCode === null) {
      if (process.platform === "win32") {
        execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          stdio: "ignore",
        });
      } else child.kill();
      await once(child, "exit");
    }
  }

  await close(proxy);
  await databaseClient?.close();
  await mongo?.stop();
  if (directory) {
    assert(path.resolve(directory).startsWith(path.join(tmpdir(), "rc-adapter-")));
    await rm(directory, { recursive: true, force: true });
  }
  if (devDirectory) {
    assert(
      path.resolve(devDirectory).startsWith(path.join(root, "adapter-proof-dev-")),
    );
    await rm(devDirectory, { recursive: true, force: true });
  }
}
