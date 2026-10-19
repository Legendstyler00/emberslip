import { randomBytes as nodeRandomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from './db';
import { hashToken } from './notes';
import { RequestStore, type Answer, type NewRequest } from './requests';

const limits = { tombstoneSeconds: 30 * 86400, maxDbBytes: 1024 ** 3, maxTtlSeconds: 7 * 86400 };
const T0 = Date.UTC(2026, 9, 19, 12, 0, 30);
const HOUR = 3_600_000;
const randomBytes = (n: number) => new Uint8Array(nodeRandomBytes(n));

function newRequest(): NewRequest {
	return {
		id: hashToken(randomBytes(32)),
		inboxId: hashToken(randomBytes(32)),
		sealedIv: randomBytes(12),
		sealed: randomBytes(2256),
		expiresAt: T0 + HOUR
	};
}

function newAnswer(): Answer {
	return { kemCiphertext: randomBytes(1120), iv: randomBytes(12), ciphertext: randomBytes(1040) };
}

describe('RequestStore', () => {
	let store: RequestStore;

	beforeEach(() => {
		store = new RequestStore(openDatabase(':memory:'), limits);
	});

	it('goes from waiting to answered to burned', () => {
		const request = newRequest();
		expect(store.create(request)).toBe('created');
		expect(store.inboxView(request.inboxId, T0)).toEqual({
			status: 'waiting',
			expiresAt: T0 + HOUR
		});
		expect(store.respondView(request.id, T0)).toMatchObject({
			status: 'open',
			sealed: request.sealed
		});

		const answer = newAnswer();
		expect(store.fulfill(request.id, answer, T0)).toBe('open');
		expect(store.respondView(request.id, T0)).toEqual({ status: 'answered' });
		expect(store.inboxView(request.inboxId, T0)).toMatchObject({ status: 'answered' });

		expect(store.openAnswer(request.inboxId, T0)).toEqual({ status: 'ok', ...answer });
		expect(store.openAnswer(request.inboxId, T0)).toMatchObject({
			status: 'burned',
			reason: 'viewed'
		});
		expect(store.respondView(request.id, T0)).toEqual({ status: 'answered' });
	});

	it('accepts only one answer', () => {
		const request = newRequest();
		store.create(request);
		const first = newAnswer();
		store.fulfill(request.id, first, T0);
		expect(store.fulfill(request.id, newAnswer(), T0)).toBe('answered');
		expect(store.openAnswer(request.inboxId, T0)).toEqual({ status: 'ok', ...first });
	});

	it('does not hand out anything before an answer arrives', () => {
		const request = newRequest();
		store.create(request);
		expect(store.openAnswer(request.inboxId, T0)).toEqual({
			status: 'waiting',
			expiresAt: T0 + HOUR
		});
	});

	it('expires unanswered requests', () => {
		const request = newRequest();
		store.create(request);
		expect(store.fulfill(request.id, newAnswer(), T0 + 2 * HOUR)).toBe('expired');
		expect(store.respondView(request.id, T0 + 2 * HOUR)).toEqual({ status: 'expired' });
		expect(store.inboxView(request.inboxId, T0 + 2 * HOUR)).toMatchObject({
			status: 'burned',
			reason: 'expired'
		});
	});

	it('gives the requester a week to read an answer', () => {
		const request = newRequest();
		store.create(request);
		store.fulfill(request.id, newAnswer(), T0 + HOUR - 1000);
		expect(store.burnExpired(T0 + 2 * HOUR)).toBe(0);
		expect(store.openAnswer(request.inboxId, T0 + 6 * 24 * HOUR).status).toBe('ok');
	});

	it('burns in the sweep and purges old tombstones', () => {
		const request = newRequest();
		store.create(request);
		expect(store.burnExpired(T0 + 2 * HOUR)).toBe(1);
		expect(store.purgeTombstones(T0 + 31 * 24 * HOUR)).toBe(1);
		expect(store.inboxView(request.inboxId, T0)).toEqual({ status: 'missing' });
	});

	it('refuses duplicate ids and inbox ids', () => {
		const request = newRequest();
		store.create(request);
		expect(store.create({ ...newRequest(), id: request.id })).toBe('exists');
		expect(store.create({ ...newRequest(), inboxId: request.inboxId })).toBe('exists');
	});
});
