import { test, expect } from "@playwright/test";

test("ruta protegida redirige a login sin sesión", async ({ page }) => {
  await page.goto("/users");
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});
