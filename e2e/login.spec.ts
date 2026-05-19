import { test, expect } from "@playwright/test";

test.describe("Login", () => {
  test("muestra formulario de acceso", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /bienvenido/i })).toBeVisible();
    await expect(page.getByText("Usuario")).toBeVisible();
    await expect(page.getByText("Contraseña")).toBeVisible();
  });

  test("redirige al panel tras login válido", async ({ page }) => {
    const user = process.env.E2E_USER?.trim();
    const password = process.env.E2E_PASSWORD?.trim();
    test.skip(!user || !password, "Define E2E_USER y E2E_PASSWORD");

    await page.goto("/login");
    await page.getByRole("textbox", { name: /usuario/i }).fill(user!);
    await page.locator('input[type="password"]').fill(password!);
    await page.getByRole("button", { name: /acceder al panel/i }).click();
    await expect(page).toHaveURL(/\//, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
