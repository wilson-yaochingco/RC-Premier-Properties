import { expect, test } from "@playwright/test";
import { API_PREFIX } from "@rc/shared";

const MAP_API_PATH = `${API_PREFIX}/properties/map`;
const BOUNDARY_PATH = "/geo/pampanga-admin3.geojson";

test("location detail routes reuse the catalog map and keep route, list, and pins synchronized", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/locations/angeles-city");

  const mapShell = page.locator("[data-map-shell]");
  await mapShell.scrollIntoViewIfNeeded();
  await expect(mapShell).toHaveAttribute("data-map-variant", "catalog");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.locator('[data-map-view="properties"]')).toBeVisible();
  await expect(page.getByLabel("Browse an area")).toHaveValue("Angeles City");
  await expect(
    page.getByText(/1 approved public pin for 9 matching properties/),
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: "Premier Property RCPP-E2E-001, view property",
    })
    .click({ force: true });
  await expect(
    page.locator(".rc-map-popup").getByRole("link", { name: /View property/ }),
  ).toHaveAttribute("href", "/properties/clark-garden-residence");
  await page.screenshot({
    path: testInfo.outputPath("location-detail-map-1366px.png"),
    animations: "disabled",
  });

  const propertyLink = page.getByRole("link", { name: "View Clark Garden Residence" });
  await propertyLink.focus();
  await expect(page.locator(".rc-map-marker--active")).toHaveCount(1);

  await page.getByLabel("Browse an area").selectOption("City of San Fernando");
  await expect(page).toHaveURL(/\/locations\/city-of-san-fernando$/);
  await expect(page.getByLabel("Browse an area")).toHaveValue("City of San Fernando");
  await expect(
    page.getByRole("heading", { name: "San Fernando Townhouse" }),
  ).toBeVisible();
  await expect(
    page.getByText(/1 approved public pin for 1 matching property/),
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
  await expect(page.getByText(/Approximate location shown for privacy/)).toBeVisible();
});
