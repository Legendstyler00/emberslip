import type { RequestEvent } from '@sveltejs/kit';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { toBase64Url } from '#lib/crypto/bytes.ts';
import { createRequest, decryptAnswer, encryptAnswer, openRequest } from '#lib/crypto/request.ts';

type Handler = (event: RequestEvent) => Promise<Response>;
const handlers: Record<string, Handler> = {};

beforeAll(async () => {
	vi.stubEnv('DB_PATH', ':memory:');
	handlers.create = (await import('./+server')).POST as Handler;
	handlers.peek = (await import('./peek/+server')).POST as Handler;
	handlers.fulfill = (await import('./fulfill/+server')).POST as Handler;
	handlers.inbox = (await import('./inbox/+server')).POST as Handler;
	handlers.open = (await import('./open/+server')).POST as Handler;
});

async function call(name: string, body: unknown) {
	const request = new Request('http://localhost/api', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	const res = await handlers[name]({
		request,
		getClientAddress: () => '198.51.100.2'
	} as unknown as RequestEvent);
	return { status: res.status, body: await res.json() };
}

describe('requests API', () => {
	it('carries an answer from the responder to the requester', async () => {
		const { shareSecret, seed, payload } = await createRequest('The Wi-Fi password, please');
		expect((await call('create', { ...payload, ttl: 3600 })).status).toBe(201);

		const { respondToken, inboxToken } = payload;
		expect((await call('inbox', { inboxToken })).body).toMatchObject({ status: 'waiting' });

		const peeked = await call('peek', { respondToken });
		expect(peeked.status).toBe(200);
		const request = await openRequest(shareSecret, peeked.body.sealedIv, peeked.body.sealed);
		expect(request.message).toBe('The Wi-Fi password, please');

		const answer = await encryptAnswer(request.publicKey, 'correct horse battery staple');
		expect((await call('fulfill', { respondToken, ...answer })).status).toBe(201);
		expect((await call('fulfill', { respondToken, ...answer })).status).toBe(409);
		expect((await call('peek', { respondToken })).body).toEqual({ status: 'answered' });

		const opened = await call('open', { inboxToken });
		expect(opened.status).toBe(200);
		expect(await decryptAnswer(seed, opened.body)).toBe('correct horse battery staple');

		const again = await call('open', { inboxToken });
		expect(again.status).toBe(410);
		expect(again.body).toMatchObject({ status: 'burned', reason: 'viewed' });
	});

	it('rejects requests that are not sealed and padded', async () => {
		const { payload } = await createRequest('');
		const bogus = toBase64Url(new Uint8Array(1500));
		expect((await call('create', { ...payload, sealed: bogus, ttl: 3600 })).status).toBe(400);
	});

	it('answers 404 for unknown tokens', async () => {
		const token = toBase64Url(new Uint8Array(32));
		expect((await call('peek', { respondToken: token })).status).toBe(404);
		expect((await call('inbox', { inboxToken: token })).status).toBe(404);
	});
});
