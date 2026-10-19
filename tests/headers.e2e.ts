import { expect, test } from '@playwright/test';

const common = {
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'no-referrer',
	'x-frame-options': 'DENY',
	'x-robots-tag': 'noindex, nofollow'
};

test('pages get a strict policy and are never cached', async ({ request }) => {
	for (const path of ['/', '/n', '/request', '/r', '/inbox']) {
		const res = await request.get(path);
		const headers = res.headers();
		expect(headers).toMatchObject({ ...common, 'cache-control': 'no-store' });
		const csp = headers['content-security-policy'];
		expect(csp).toContain("default-src 'self'");
		expect(csp).toContain("frame-ancestors 'none'");
		expect(csp).not.toContain('unsafe-inline');
		expect(csp).not.toContain('unsafe-eval');
	}
});

test('static files and the API get headers too', async ({ request }) => {
	const html = await (await request.get('/')).text();
	const asset = html.match(/\/_app\/immutable\/[^"]+\.js/)?.[0];
	expect(asset).toBeTruthy();

	for (const path of [asset!, '/robots.txt', '/api/health']) {
		const headers = (await request.get(path)).headers();
		expect(headers).toMatchObject(common);
		expect(headers['content-security-policy']).toContain("default-src 'none'");
	}
});
