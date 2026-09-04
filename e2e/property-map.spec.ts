import { expect, test, type Page } from "@playwright/test";

const MAP_API_PATH = "/api/v1/properties/map";
const BOUNDARY_PATH = "/geo/pampanga-admin3.geojson";

function mapRequests(page: Page): string[] {
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === MAP_API_PATH || url.pathname === BOUNDARY_PATH) {
      requests.push(url.pathname);
    }
  });
  return requests;
}

test("the heavy map stays lazy and mobile List/Map discovery shares URL filters", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = mapRequests(page);

  await page.goto("/");
  expect(requests).toEqual([]);

  await page.goto("/properties");
  await expect(page.getByRole("button", { name: "List" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("heading", { name: "Clark Garden Residence" }),
  ).toBeVisible();
  expect(requests).toEqual([]);

  const mapApi = page.waitForResponse(
    (response) => new URL(response.url()).pathname === MAP_API_PATH,
  );
  const boundaries = page.waitForResponse(
    (response) => new URL(response.url()).pathname === BOUNDARY_PATH,
  );
  await page.getByRole("button", { name: "Map" }).click();

  expect((await mapApi).status()).toBe(200);
  expect((await boundaries).status()).toBe(200);
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.getByLabel("Browse an area")).toBeVisible();
  await expect(
    page.getByText(/3 approved public pins for 11 matching properties/),
  ).toBeVisible();

  await page.getByLabel("Browse an area").selectOption("City of San Fernando");
  await expect(page).toHaveURL(/location=City\+of\+San\+Fernando/);
  await expect(page.getByText("1 result", { exact: true })).toBeVisible();
  await expect(page.getByText("Selected location")).toBeVisible();
  await expect(
    page.getByText("City of San Fernando", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(/1 approved public pin for 1 matching property/),
  ).toBeVisible();

  await page.locator(".leaflet-marker-icon").click();
  await expect(page.getByRole("link", { name: /View property/ })).toHaveAttribute(
    "href",
    "/properties/san-fernando-commercial-lot",
  );
});

test("card focus highlights its approved marker and a boundary-data failure is isolated", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/properties?propertyId=RCPP-E2E-001");

  const mapShell = page.locator("[data-map-shell]");
  await mapShell.scrollIntoViewIfNeeded();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(1);

  const propertyLink = page.getByRole("link", { name: "View Clark Garden Residence" });
  await propertyLink.focus();
  await expect(page.locator(".rc-map-marker--active")).toHaveCount(1);

  await page.route(`**${BOUNDARY_PATH}`, (route) => route.abort("failed"));
  await page.goto("/properties");
  await mapShell.scrollIntoViewIfNeeded();
  await expect(
    page.getByText("Map boundaries are temporarily unavailable."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Clark Garden Residence" }),
  ).toBeVisible();
});

test("property detail loads only its separately approved public pin", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/properties/clark-garden-residence");

  const mapShell = page.locator("[data-map-shell]");
  await mapShell.scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Load interactive map" }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(
    page.getByText("1 approved public pin on this results page."),
  ).toBeVisible();
  await expect(
    page.getByText(/public precision setting \(approximate\)/),
  ).toBeVisible();
});
