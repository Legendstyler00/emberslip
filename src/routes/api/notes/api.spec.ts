import type { RequestEvent } from '@sveltejs/kit';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fromBase64Url, toBase64Url } from '#lib/crypto/bytes.ts';
import {
	decryptNote,
	deriveLinkToken,
	deriveManageToken,
	deriveNoteSecrets,
	encryptNote,
	generateManageKey,
	generateNoteKey
} from '#lib/crypto/note.ts';

type Handler = (event: RequestEvent) => Promise<Response>;
let create: Handler, peek: Handler, open: Handler, status: Handler, burn: Handler;

beforeAll(async () => {
	vi.stubEnv('DB_PATH', ':memory:');
	create = (await import('./+server')).POST as Handler;
	peek = (await import('./peek/+server')).POST as Handler;
	open = (await import('./open/+server')).POST as Handler;
	status = (await import('./status/+server')).POST as Handler;
	burn = (await import('./burn/+server')).POST as Handler;
});

function call(handler: Handler, body: unknown, address = '198.51.100.1') {
	const request = new Request('http://localhost/api', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	return handler({ request, getClientAddress: () => address } as unknown as RequestEvent);
}

describe('notes API', () => {
	it('creates, peeks, opens and burns a password-protected note', async () => {
		const key = generateNoteKey();
		const payload = await encryptNote(key, 'launch codes', 'pw');

		const created = await call(create, { ...payload, views: 1, ttl: 3600 });
		expect(created.status).toBe(201);
		expect(created.headers.get('cache-control')).toBe('no-store');

		const linkToken = await deriveLinkToken(key);
		const meta = await (await call(peek, { linkToken })).json();
		expect(meta).toMatchObject({ status: 'active', hasPassword: true, viewsLeft: 1 });

		const wrong = await call(open, { linkToken, pwToken: toBase64Url(new Uint8Array(32)) });
		expect(wrong.status).toBe(403);

		const secrets = await deriveNoteSecrets(key, meta.kdf, 'pw');
		const opened = await call(open, { linkToken, pwToken: secrets.pwToken });
		expect(opened.status).toBe(200);
		const body = await opened.json();
		expect(await decryptNote(secrets, meta.kdf, body.iv, body.ciphertext)).toBe('launch codes');

		const again = await call(open, { linkToken, pwToken: secrets.pwToken });
		expect(again.status).toBe(410);
		expect(await again.json()).toMatchObject({ status: 'burned', reason: 'viewed' });
	});

	it('shows the status link and burns the note through it', async () => {
		const key = generateNoteKey();
		const manageToken = await deriveManageToken(generateManageKey());
		const payload = await encryptNote(key, 'status please', null);
		expect((await call(create, { ...payload, views: 2, ttl: 3600, manageToken })).status).toBe(201);

		const linkToken = await deriveLinkToken(key);
		await call(open, { linkToken });
		const active = await call(status, { manageToken });
		expect(active.status).toBe(200);
		expect(active.headers.get('cache-control')).toBe('no-store');
		const body = await active.json();
		expect(body).toMatchObject({ status: 'active', viewsLeft: 1 });
		expect(body.opens).toHaveLength(1);
		expect(body.opens[0] % 60_000).toBe(0);

		const burned = await call(burn, { manageToken });
		expect(burned.status).toBe(410);
		expect(await burned.json()).toMatchObject({ status: 'burned', reason: 'creator' });
		expect((await call(open, { linkToken })).status).toBe(410);

		// The note's own link token is not a status link.
		expect((await call(status, { manageToken: linkToken })).status).toBe(404);
	});

	it('answers 404 for a link token it does not know', async () => {
		const res = await call(peek, { linkToken: toBase64Url(new Uint8Array(32)) });
		expect(res.status).toBe(404);
	});

	it('rejects malformed notes', async () => {
		const payload = await encryptNote(generateNoteKey(), 'x', null);
		const unpadded = toBase64Url(fromBase64Url(payload.ciphertext).slice(0, 500));
		const cases = [
			{ ...payload, views: 0, ttl: 3600 },
			{ ...payload, views: 11, ttl: 3600 },
			{ ...payload, views: 1, ttl: 30 },
			{ ...payload, views: 1, ttl: 99 * 86400 },
			{ ...payload, views: 1, ttl: 3600, ciphertext: unpadded },
			{ ...payload, views: 1, ttl: 3600, linkToken: 'short' },
			{ ...payload, views: 1, ttl: 3600, pwToken: toBase64Url(new Uint8Array(32)) },
			{ ...payload, views: 1, ttl: 3600, manageToken: 'short' }
		];
		for (const body of cases) expect((await call(create, body)).status).toBe(400);
	});

	it('rate-limits note creation per client', async () => {
		const statuses: number[] = [];
		for (let i = 0; i < 31; i++) {
			const payload = await encryptNote(generateNoteKey(), 'x', null);
			statuses.push((await call(create, { ...payload, views: 1, ttl: 3600 }, '192.0.2.9')).status);
		}
		expect(statuses.slice(0, 30).every((s) => s === 201)).toBe(true);
		expect(statuses[30]).toBe(429);
	});
});
