import { test, expect } from '@playwright/test';

test.describe('Audit Ecosystem', () => {

    test('Audit Form and Data Flow', async ({ page }) => {
        const token = "token-" + Math.random().toString(36).substring(7);
        const arrival = new Date().toISOString();

        await page.goto(`/audit/form?token=${token}&arrival=${arrival}`);
        await expect(page.getByText(/Combined Clinical Audit/i)).toBeVisible();

        // ALERTS Section
        await page.fill('input[type="time"]', '10:00');

        // Click Risk Level
        await page.getByText('Medium Risk', { exact: true }).click();

        // Wait for conditional observation buttons
        await page.waitForTimeout(1000); // Wait for MotionDiv animation
        await page.locator('button').filter({ hasText: /^Yes$/ }).first().click();

        // Compassionate care "Yes"
        await page.locator('button').filter({ hasText: /^Yes$/ }).last().click();

        // Safeguarding
        await page.getByLabel(/Safeguarding Screening/i).click();

        // SAFETY Section
        await page.getByText('Self-Harm Type', { exact: true }).click();
        await page.getByText('Antecedent / Trigger', { exact: true }).click();
        await page.getByText('Future Intent', { exact: true }).click();
        await page.getByText('Psych & Social History', { exact: true }).click();
        await page.getByText('Drug / Alcohol Use', { exact: true }).click();

        // Switches
        await page.locator('button#team-comm').click();
        await page.locator('button#capacity-assess').click();
        await page.locator('button#discharge-plan').click();

        // Submit
        await page.click('button:has-text("Submit Complete Audit")');

        // Verification
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
        await expect(page.getByText(/QIP Analytics/i)).toBeVisible();

        await page.click('a:has-text("View All Data")');
        await expect(page).toHaveURL(/\/data/);

        // Filter by token
        await page.fill('input[placeholder*="Filter by MRN"]', token.substring(0, 5));
        await page.waitForTimeout(1000);
        await expect(page.locator('table')).toContainText(token.substring(0, 5));
    });

    test('Dashboard Metric Integrity', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page.getByText(/Total Audits/i)).toBeVisible();
    });

    test('Guidance Interaction', async ({ page }) => {
        const token = "guide-test-2";
        const arrival = new Date().toISOString();
        await page.goto(`/audit/form?token=${token}&arrival=${arrival}`);

        await expect(page.locator('img[alt="Alerts Guidance"]')).toBeVisible();
        await expect(page.locator('img[alt="Safety Guidance"]')).toBeVisible();
    });
});
