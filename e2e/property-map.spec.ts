import { expect, test } from "@playwright/test";
import { API_PREFIX } from "@rc/shared";

const MAP_API_PATH = `${API_PREFIX}/properties/map`;
const BOUNDARY_PATH = "/geo/pampanga-admin3.geojson";

test("location navigation opens filtered catalogs without the removed detail map", async ({
  page,
}) => {
  await page.goto("/properties?location=Angeles+City");
  await expect(
    page.getByRole("heading", { name: "Clark Garden Residence" }),
  ).toBeVisible();
  await expect(page.locator("[data-map-shell]")).toHaveCount(0);
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "City of San Fernando", exact: true })
    .click();
  await expect(page).toHaveURL(/location=City\+of\+San\+Fernando/);
  await expect(
    page.getByRole("heading", { name: "San Fernando Townhouse" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Clark Garden Residence" }),
  ).toHaveCount(0);
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
