import { test, expect } from '@playwright/test';

test('login shows readable errors (never "[object Object]")', async ({ page }) => {
  await page.route('**/api/trace/frontend-log', async (route) => {
    await route.fulfill({ status: 204, contentType: 'application/json', body: '{}' });
  });

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } }),
    });
  });

  await page.goto('/login');

  await page.getByPlaceholder('you@example.com').fill('existing@user.com');
  await page.getByPlaceholder('Your password').fill('wrong');
  await page.getByRole('button', { name: /log in/i }).click();

  await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  await expect(page.getByText('[object Object]')).toHaveCount(0);
});
