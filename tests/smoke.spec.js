const { test, expect } = require('@playwright/test');

test('index.html carrega corretamente', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page).toHaveTitle(/Fluxo de Caixa/);
});
