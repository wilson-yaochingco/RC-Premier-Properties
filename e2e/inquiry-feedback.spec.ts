import { expect, test, type Locator, type Page } from "@playwright/test";
import { API_PREFIX } from "@rc/shared";

async function fillInquiry(page: Page) {
  await page.getByLabel("Name", { exact: true }).fill("Feedback Test Visitor");
  await page.getByLabel("Email", { exact: true }).fill("feedback@example.test");
  await page.getByLabel("Phone", { exact: true }).fill("+63 917 555 0110");
  await page
    .getByLabel("Message", { exact: true })
    .fill("A synthetic inquiry for feedback verification.");
  await page.getByRole("checkbox").check();
}

async function expectNoOverflow(page: Page, panel: Locator) {
  await expect(panel).toBeVisible();
  const geometry = await panel.evaluate((element) => ({
    width: element.clientWidth,
    scrollWidth: element.scrollWidth,
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    clipped: [...element.querySelectorAll("p, strong, ul")].some(
      (child) => child.scrollHeight > child.clientHeight + 1,
    ),
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.clipped).toBe(false);
}

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`inquiry success, error, validation and home heading fit at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/contact");
    await fillInquiry(page);
    await page.getByRole("button", { name: "Send inquiry" }).click();
    const success = page.getByRole("status");
    await expect(success).toContainText("Inquiry submitted successfully.");
    await expect(success).toContainText(
      "RC Premier Properties will get back to you soon.",
    );
    await expect(success).not.toContainText(/email.*sent|notification.*delivered/i);
    await expect(success).toHaveAttribute("aria-live", "polite");
    await expect(success).toHaveAttribute("aria-atomic", "true");
    await expectNoOverflow(page, success);
    await success.screenshot({ path: testInfo.outputPath("success.png") });

    let responseStatus = 500;
    const keys: Array<string | undefined> = [];
    await page.route(`**${API_PREFIX}/inquiries`, (route) => {
      if (route.request().method() !== "POST") return route.continue();
      keys.push(route.request().headers()["idempotency-key"]);
      return route.fulfill({
        status: responseStatus,
        headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:3100" },
        json: {
          status: "error",
          statusCode: responseStatus,
          message: "Internal Server Error: private database/provider exception",
          issues:
            responseStatus === 500
              ? [{ field: "email", message: "private server issue" }]
              : [{ field: "email", message: "Enter a deliverable email address." }],
        },
      });
    });
    await fillInquiry(page);
    await page.getByRole("button", { name: "Send inquiry" }).click();
    const error = page.locator("#inquiry-errors");
    await expect(error).toContainText("We couldn't submit your inquiry.");
    await expect(error).not.toContainText(
      /Internal Server Error|private|database|provider/,
    );
    await expect(error).toBeFocused();
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
      "Feedback Test Visitor",
    );
    await expectNoOverflow(page, error);
    await error.screenshot({ path: testInfo.outputPath("error.png") });

    responseStatus = 422;
    await page.getByRole("button", { name: "Send inquiry" }).click();
    await expect(error).toContainText("Please check your inquiry details.");
    await expect(
      error.getByRole("link", { name: "Email: Enter a deliverable email address." }),
    ).toHaveAttribute("href", "#inquiry-email");
    await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.locator("#inquiry-email-error")).toHaveText(
      "Enter a deliverable email address.",
    );
    await expectNoOverflow(page, error);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
    await error.screenshot({ path: testInfo.outputPath("validation.png") });

    await page.goto("/");
    const heading = page.getByRole("heading", {
      level: 1,
      name: "Discover Your Next Home",
      exact: true,
    });
    await expectNoOverflow(page, heading);
    await expect(page.locator(".home-hero__image")).toBeVisible();
    await expect(page.locator(".home-hero__shade")).toBeVisible();
    const search = page.getByRole("search", { name: "Search properties for sale" });
    await search.getByRole("textbox").fill("RCPP-E2E-001");
    await search
      .getByRole("button", { name: "Search properties", exact: true })
      .click();
    await expect(page).toHaveURL(/\/properties\?keyword=RCPP-E2E-001&purpose=sale/);
  });
}

test("phone and consent remain required in the browser and submission handler", async ({
  page,
}) => {
  await page.goto("/contact");
  await fillInquiry(page);
  let requests = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().endsWith(`${API_PREFIX}/inquiries`)
    )
      requests += 1;
  });
  const phone = page.getByLabel("Phone", { exact: true });
  const consent = page.getByRole("checkbox");
  await expect(phone).toHaveAttribute("required", "");
  await expect(consent).toHaveAttribute("required", "");
  await phone.fill("");
  await page.getByRole("button", { name: "Send inquiry" }).click();
  expect(
    await phone.evaluate((input: HTMLInputElement) => input.validity.valueMissing),
  ).toBe(true);
  await phone.fill("+63 917 555 0110");
  await consent.uncheck();
  await page.getByRole("button", { name: "Send inquiry" }).click();
  expect(
    await consent.evaluate((input: HTMLInputElement) => input.validity.valueMissing),
  ).toBe(true);
  await consent.check();
  await phone.fill("invalid-phone");
  await page.getByRole("button", { name: "Send inquiry" }).click();
  await expect(page.locator("#inquiry-errors")).toContainText(
    "Enter a valid phone number.",
  );
  await phone.fill("+63 917 555 0110");
  await consent.uncheck();
  await page
    .locator("form")
    .filter({ has: phone })
    .evaluate((form: HTMLFormElement) => {
      form.noValidate = true;
      form.requestSubmit();
    });
  await expect(page.locator("#inquiry-errors")).toContainText(
    "Consent is required to continue.",
  );
  await expect(page.getByRole("status")).toHaveCount(0);
  expect(requests).toBe(0);
});
