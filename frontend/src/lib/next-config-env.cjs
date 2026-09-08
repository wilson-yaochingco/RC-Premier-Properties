/**
 * Read the small public subset needed while Next.js loads `next.config.ts`.
 *
 * This stays as CommonJS because Next recompiles its TypeScript config to CommonJS and
 * reloads it when a custom production server starts. Importing application TypeScript
 * from that compiled file is not supported by that runtime path.
 */
module.exports = function readNextConfigEnvironment() {
  const deploymentEnvironment = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV?.trim();
  const publicDeployment =
    deploymentEnvironment === "staging" || deploymentEnvironment === "production";

  function configuredOrigin(name, value, fallback) {
    let url;
    try {
      url = new URL(value?.trim() || fallback || "");
    } catch {
      throw new Error(`${name} must be an exact HTTP(S) origin.`);
    }
    const loopback =
      url.hostname === "localhost" ||
      url.hostname.endsWith(".localhost") ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]" ||
      url.hostname === "::1";
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      (publicDeployment && (url.protocol !== "https:" || loopback))
    ) {
      throw new Error(
        `${name} must be an exact${publicDeployment ? " non-local HTTPS" : " HTTP(S)"} origin.`,
      );
    }
    return url.origin;
  }

  const apiBaseUrl = configuredOrigin(
    "NEXT_PUBLIC_API_URL",
    process.env.NEXT_PUBLIC_API_URL,
    publicDeployment ? undefined : "http://localhost:5000",
  );
  const mapTileUrl =
    process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim() ||
    (publicDeployment
      ? undefined
      : "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png");
  if (
    !mapTileUrl ||
    !["{z}", "{x}", "{y}"].every((token) => mapTileUrl.includes(token))
  ) {
    throw new Error(
      "NEXT_PUBLIC_MAP_TILE_URL must be configured with {z}, {x}, and {y} placeholders.",
    );
  }
  const parsedMapTileUrl = new URL(mapTileUrl);
  if (publicDeployment && parsedMapTileUrl.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_MAP_TILE_URL must use HTTPS in a public deployment.");
  }
  const mediaOrigin = process.env.NEXT_PUBLIC_MEDIA_ORIGIN?.trim()
    ? configuredOrigin("NEXT_PUBLIC_MEDIA_ORIGIN", process.env.NEXT_PUBLIC_MEDIA_ORIGIN)
    : undefined;

  return { apiBaseUrl, mapTileUrl, mediaOrigin, publicDeployment };
};
