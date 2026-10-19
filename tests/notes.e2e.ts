import type { Page } from '@playwright/test';
import { expect, expectNotSent, fragmentOf, readQr, test } from './fixtures';

async function createNote(
	page: Page,
	text: string,
	options: { views?: number; password?: string } = {}
): Promise<string> {
	await page.goto('/');
	await page.getByLabel('Your secret').fill(text);
	if (options.views) {
		await page.getByLabel(String(options.views), { exact: true }).check({ force: true });
	}
	if (options.password) {
		await page.getByText('Protect with a password').click();
		await page.getByLabel('Password', { exact: true }).fill(options.password);
	}
	await page.getByRole('button', { name: 'Create secret link' }).click();
	const link = await page.getByRole('textbox', { name: 'Secret link' }).inputValue();
	expect(link).toMatch(/\/n#[A-Za-z0-9_-]{43}$/);
	return link;
}

test('a note can be read once and then shows a tombstone', async ({ openPage, sent }) => {
	const text = 'vault code 4711-correct-horse';
	const link = await createNote(await openPage(), text);

	const reader = await openPage(link);
	await expect(reader.getByRole('heading', { name: 'Someone sent you a secret' })).toBeVisible();
	await reader.getByRole('button', { name: 'Reveal note' }).click();
	await expect(reader.locator('#secret')).toHaveValue(text);
	await expect(reader.getByText('This note has now burned')).toBeVisible();
	await expect.poll(() => reader.url()).not.toContain('#');

	const latecomer = await openPage(link);
	await expect(
		latecomer.getByRole('heading', { name: 'This note has already burned' })
	).toBeVisible();

	expectNotSent(sent, text, fragmentOf(link));
});

test('the share screen can show the link as a QR code', async ({ openPage }) => {
	const page = await openPage();
	const link = await createNote(page, 'scan me');
	const qr = page.getByRole('img', { name: 'QR code of the secret link' });
	await expect(qr).toHaveCount(0);

	await page.getByRole('button', { name: 'Show QR code' }).click();
	await expect(qr).toBeVisible();
	expect(await readQr(qr)).toBe(link);

	await page.getByRole('button', { name: 'Hide QR code' }).click();
	await expect(qr).toHaveCount(0);
});

test('opening the link without revealing uses up no view', async ({ openPage }) => {
	const link = await createNote(await openPage(), 'still here');

	for (let i = 0; i < 3; i++) {
		const page = await openPage(link);
		await expect(page.getByRole('button', { name: 'Reveal note' })).toBeVisible();
	}

	const reader = await openPage(link);
	await reader.getByRole('button', { name: 'Reveal note' }).click();
	await expect(reader.locator('#secret')).toHaveValue('still here');
});

test('a note with several views can be opened that many times', async ({ openPage }) => {
	const link = await createNote(await openPage(), 'twice', { views: 2 });

	for (const left of ['It can be opened 1 more time', 'This note has now burned']) {
		const reader = await openPage(link);
		await reader.getByRole('button', { name: 'Reveal note' }).click();
		await expect(reader.getByText(left)).toBeVisible();
	}
	const third = await openPage(link);
	await expect(third.getByRole('heading', { name: 'This note has already burned' })).toBeVisible();
});

test('a password-protected note needs the right password', async ({ openPage, sent }) => {
	const text = 'behind a password';
	const password = 'tangerine-dream';
	const link = await createNote(await openPage(), text, { password });

	const reader = await openPage(link);
	const field = reader.getByLabel('This note is protected by a password');
	await field.fill('wrong');
	await reader.getByRole('button', { name: 'Reveal note' }).click();
	await expect(reader.getByText('Wrong password. 4 attempts left')).toBeVisible();

	await field.fill(password);
	await reader.getByRole('button', { name: 'Reveal note' }).click();
	await expect(reader.locator('#secret')).toHaveValue(text);

	expectNotSent(sent, text, password, fragmentOf(link));
});

test('five wrong passwords burn the note', async ({ openPage }) => {
	const link = await createNote(await openPage(), 'never shown', { password: 'right' });

	const reader = await openPage(link);
	const field = reader.getByLabel('This note is protected by a password');
	for (let left = 4; left >= 1; left--) {
		await field.fill(`wrong ${left}`);
		await reader.getByRole('button', { name: 'Reveal note' }).click();
		await expect(reader.getByText(`${left} attempt`)).toBeVisible();
	}
	await field.fill('wrong 0');
	await reader.getByRole('button', { name: 'Reveal note' }).click();
	await expect(reader.getByRole('heading', { name: 'This note was destroyed' })).toBeVisible();
});

test('an incomplete link says so', async ({ openPage }) => {
	const page = await openPage('/n#abc');
	await expect(page.getByRole('heading', { name: 'This link is incomplete' })).toBeVisible();
});
