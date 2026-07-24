import { expect, test } from "@playwright/test";

test("home page renders hero content", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /smarter solutions/i })).toBeVisible();
    await expect(page.getByText("The modern toolbox for Power Platform, built for speed, simplicity and security.")).toBeVisible();
});
