import path from "node:path";
import { readFileSync } from "node:fs";
import { API_PREFIX } from "@rc/shared";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import readNextConfigEnvironment from "./src/lib/next-config-env.cjs";

const {
  apiBaseUrl: API_BASE_URL,
  mapTileUrl: MAP_TILE_URL,
  mediaOrigin: MEDIA_ORIGIN,
  publicDeployment,
  preventIndexing,
} = readNextConfigEnvironment();

// The opaque workspace import needs explicit traces, limited to this API function.
const { packages } = JSON.parse(
  readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"),
);
const backendPackages = new Set();
function includeDependencies(packagePath) {
  const manifest = packages[packagePath];
  for (const name of Object.keys({
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
  })) {
    let directory = packagePath;
    let dependencyPath;
    while (true) {
      const candidate = `${directory ? `${directory}/` : ""}node_modules/${name}`;
      if (packages[candidate]) {
        dependencyPath = candidate;
        break;
      }
      if (!directory) throw new Error(`Missing locked backend dependency: ${name}`);
      directory = path.posix.dirname(directory);
      if (directory === ".") directory = "";
    }
    if (backendPackages.has(dependencyPath)) continue;
    backendPackages.add(dependencyPath);
    if (!packages[dependencyPath].link) includeDependencies(dependencyPath);
  }
}
includeDependencies("backend");

function originOf(value) {
  return new URL(value).origin;
}

/**
 * Build a provider-aware policy without wildcard hosts. Next.js hydration and the
 * current Leaflet rendering path require inline scripts/styles; production never adds
 * `unsafe-eval`, and externally loaded scripts remain forbidden.
 *
 * @param {{ apiOrigin: string, mapTileOrigin: string, mediaOrigin?: string, upgradeInsecureRequests: boolean }} config
 */
export function buildContentSecurityPolicy(config) {
  const imageSources = [
    "'self'",
    "data:",
    "blob:",
    config.mapTileOrigin,
    // YouTube poster thumbnails for the homepage property tours.
    "https://i.ytimg.com",
    ...(config.mediaOrigin ? [config.mediaOrigin] : []),
  ];
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `img-src ${imageSources.join(" ")}`,
    `connect-src 'self' ${config.apiOrigin}`,
    "frame-src https://www.youtube-nocookie.com",
    "media-src 'self' https://videos.ctfassets.net",
    "manifest-src 'self'",
  ];
  if (config.upgradeInsecureRequests) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

function remoteMediaPattern() {
  if (!MEDIA_ORIGIN) return [];
  const url = new URL(MEDIA_ORIGIN);
  return [
    {
      protocol: url.protocol.slice(0, -1),
      hostname: url.hostname,
      port: url.port,
      pathname: "/**",
    },
  ];
}

export default function createNextConfig(phase) {
  const optimizedRuntime = phase !== PHASE_DEVELOPMENT_SERVER;
  const securityHeaders = [
    ...(preventIndexing
      ? [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }]
      : []),
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    },
    ...(optimizedRuntime
      ? [
          {
            key: "Content-Security-Policy",
            value: buildContentSecurityPolicy({
              apiOrigin: originOf(API_BASE_URL),
              mapTileOrigin: originOf(MAP_TILE_URL),
              ...(MEDIA_ORIGIN ? { mediaOrigin: MEDIA_ORIGIN } : {}),
              upgradeInsecureRequests: publicDeployment,
            }),
          },
        ]
      : []),
    ...(optimizedRuntime
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
        ]
      : []),
  ];

  return {
    poweredByHeader: false,
    serverExternalPackages: [
      "rc-premier-backend",
      "mongoose",
      "sharp",
      "express",
      "openid-client",
      "cloudinary",
    ],
    outputFileTracingRoot: path.join(import.meta.dirname, ".."),
    outputFileTracingIncludes: {
      [`${API_PREFIX}/*`]: [
        "../backend/dist/**/*",
        "../backend/package.json",
        "../shared/dist/**/*",
        "../shared/package.json",
        "../node_modules/rc-premier-backend/package.json",
        ...[...backendPackages].map((directory) => `../${directory}/**/*`),
      ],
    },
    images: {
      formats: ["image/avif", "image/webp"],
      remotePatterns: [
        ...(!publicDeployment
          ? [
              {
                protocol: "https",
                hostname: "images.unsplash.com",
                port: "",
                pathname: "/photo-**",
              },
            ]
          : []),
        ...remoteMediaPattern(),
      ],
    },
    async headers() {
      return [
        {
          source: `/((?!${API_PREFIX.split("/")[1]}(?:/|$)).*)`,
          headers: securityHeaders,
        },
        {
          source: "/admin/:path*",
          headers: [
            { key: "Cache-Control", value: "private, no-store, max-age=0" },
            { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          ],
        },
        {
          source: "/geo/:path*",
          headers: [
            {
              key: "Cache-Control",
              value:
                "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
            },
          ],
        },
      ];
    },
  };
}
