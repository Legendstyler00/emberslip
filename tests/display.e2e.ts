import { expect, test } from './fixtures';

test('the dark mode with the CRT effect is the default', async ({ openPage }) => {
	const page = await openPage('/');
	const html = page.locator('html');

	await expect(html).not.toHaveAttribute('data-theme');
	await expect(html).toHaveClass(/\brt-js\b/);
	await expect(html).not.toHaveClass(/\brt-crt-off\b/);
	await expect(page.getByRole('button', { name: 'Sewer' })).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByRole('switch', { name: 'CRT' })).toHaveAttribute('aria-checked', 'true');
});

test('mode and CRT choices apply at once and are remembered', async ({ openPage }) => {
	const page = await openPage('/');
	const html = page.locator('html');
	const themeColor = page.locator('meta[name="theme-color"]');

	await page.getByRole('button', { name: 'Daylight' }).click();
	await expect(html).toHaveAttribute('data-theme', 'tageslicht');
	await expect(themeColor).toHaveAttribute('content', '#eef2ec');
	await expect(page.getByRole('button', { name: 'Daylight' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	await page.getByRole('switch', { name: 'CRT' }).click();
	await expect(html).toHaveClass(/\brt-crt-off\b/);
	await expect(page.getByRole('switch', { name: 'CRT' })).toHaveAttribute('aria-checked', 'false');

	await page.reload();
	await expect(html).toHaveAttribute('data-theme', 'tageslicht');
	await expect(themeColor).toHaveAttribute('content', '#eef2ec');
	await expect(html).toHaveClass(/\brt-crt-off\b/);
	await expect(page.getByRole('switch', { name: 'CRT' })).toHaveAttribute('aria-checked', 'false');

	await page.getByRole('button', { name: 'Sewer' }).click();
	await expect(html).not.toHaveAttribute('data-theme');
	await expect(themeColor).toHaveAttribute('content', '#0e1210');
});

test('the CRT effect stays off for people who prefer reduced motion', async ({ openPage }) => {
	const page = await openPage();
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');

	await expect(page.locator('html')).toHaveClass(/\brt-crt-off\b/);
	await expect(page.getByRole('switch', { name: 'CRT' })).toHaveAttribute('aria-checked', 'false');
});

test('nothing is stored until a switch is used', async ({ openPage }) => {
	const page = await openPage('/');
	await expect(page.getByRole('switch', { name: 'CRT' })).toBeVisible();
	expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
