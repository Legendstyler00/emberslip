import { test as base, expect, type Browser, type Locator, type Page } from '@playwright/test';
import jsQR from 'jsqr';

declare global {
	interface Window {
		cspViolations: string[];
	}
}

interface Fixtures {
	/** Every request URL and body sent by pages opened through `openPage`. */
	sent: string[];
	/** Opens a page in a fresh browser context, like a different person would. */
	openPage: (url?: string) => Promise<Page>;
}

export const test = base.extend<Fixtures>({
	// Playwright needs the destructuring pattern even when a fixture depends on nothing.
	// eslint-disable-next-line no-empty-pattern
	sent: async ({}, use) => {
		await use([]);
	},
	openPage: async ({ browser, sent }, use) => {
		const pages: Page[] = [];
		await use(async (url) => {
			const page = await newPage(browser, sent);
			pages.push(page);
			if (url) await page.goto(url);
			return page;
		});
		for (const page of pages) {
			const violations = await page.evaluate(() => window.cspViolations).catch(() => []);
			expect(violations, 'Content Security Policy violations').toEqual([]);
			await page.context().close();
		}
	}
});

async function newPage(browser: Browser, sent: string[]): Promise<Page> {
	const context = await browser.newContext();
	await context.addInitScript(() => {
		window.cspViolations = [];
		document.addEventListener('securitypolicyviolation', (event) => {
			window.cspViolations.push(`${event.violatedDirective} ${event.blockedURI}`);
		});
	});
	const page = await context.newPage();
	page.on('request', (request) => {
		sent.push(request.url(), request.postData() ?? '');
	});
	return page;
}

/** The part after `#`, which must never be sent to the server. */
export function fragmentOf(link: string): string {
	return new URL(link).hash.slice(1);
}

export function expectNotSent(sent: string[], ...secrets: string[]) {
	for (const secret of secrets) {
		expect(
			sent.filter((entry) => entry.includes(secret)),
			`"${secret}" was sent`
		).toEqual([]);
	}
}

/** Decodes a QR code rendered by the QrCode component from its SVG path. */
export async function readQr(svg: Locator): Promise<string | undefined> {
	const viewBox = await svg.getAttribute('viewBox');
	const path = await svg.locator('path').getAttribute('d');
	const scale = 4;
	const width = Number(viewBox?.split(' ')[2]) * scale;
	const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
	for (const [, x, y, run] of (path ?? '').matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
		for (let row = Number(y) * scale; row < (Number(y) + 1) * scale; row++) {
			for (let col = Number(x) * scale; col < (Number(x) + Number(run)) * scale; col++) {
				pixels.fill(0, (row * width + col) * 4, (row * width + col) * 4 + 3);
			}
		}
	}
	return jsQR(pixels, width, width)?.data;
}

export { expect };
