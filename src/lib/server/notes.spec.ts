import { randomBytes as nodeRandomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from './db';
import { hashToken, NoteStore, type NewNote } from './notes';

const limits = { maxPasswordAttempts: 5, tombstoneSeconds: 30 * 86400, maxDbBytes: 1024 ** 3 };
const T0 = Date.UTC(2026, 9, 19, 12, 0, 30);
const HOUR = 3_600_000;
const randomBytes = (n: number) => new Uint8Array(nodeRandomBytes(n));

function newNote(overrides: Partial<NewNote> = {}): NewNote {
	return {
		id: hashToken(randomBytes(32)),
		iv: randomBytes(12),
		ciphertext: randomBytes(1040),
		kdf: null,
		pwHash: null,
		views: 1,
		expiresAt: T0 + HOUR,
		...overrides
	};
}

describe('NoteStore', () => {
	let store: NoteStore;

	beforeEach(() => {
		store = new NoteStore(openDatabase(':memory:'), limits);
	});

	it('burns a one-view note after it is opened', () => {
		const note = newNote();
		expect(store.create(note)).toBe('created');
		expect(store.peek(note.id, T0)).toMatchObject({ status: 'active', viewsLeft: 1 });

		const opened = store.open(note.id, null, T0);
		expect(opened).toMatchObject({ status: 'ok', viewsLeft: 0 });
		if (opened.status === 'ok') expect(opened.ciphertext).toEqual(note.ciphertext);

		expect(store.open(note.id, null, T0)).toEqual({
			status: 'burned',
			burnedAt: Date.UTC(2026, 9, 19, 12, 0, 0),
			reason: 'viewed'
		});
	});

	it('peeking does not use up views', () => {
		const note = newNote({ views: 2 });
		store.create(note);
		for (let i = 0; i < 5; i++) store.peek(note.id, T0);
		expect(store.open(note.id, null, T0)).toMatchObject({ status: 'ok', viewsLeft: 1 });
		expect(store.open(note.id, null, T0)).toMatchObject({ status: 'ok', viewsLeft: 0 });
		expect(store.open(note.id, null, T0).status).toBe('burned');
	});

	it('serves exactly as many views as allowed when opened concurrently', async () => {
		const note = newNote({ views: 3 });
		store.create(note);
		const results = await Promise.all(
			Array.from({ length: 10 }, () => Promise.resolve().then(() => store.open(note.id, null, T0)))
		);
		expect(results.filter((r) => r.status === 'ok')).toHaveLength(3);
		expect(results.filter((r) => r.status === 'burned')).toHaveLength(7);
	});

	it('reports unknown notes as missing', () => {
		expect(store.peek(hashToken(randomBytes(32)), T0)).toEqual({ status: 'missing' });
		expect(store.open(hashToken(randomBytes(32)), null, T0)).toEqual({ status: 'missing' });
	});

	it('refuses a duplicate id', () => {
		const note = newNote();
		store.create(note);
		expect(store.create(note)).toBe('exists');
	});

	it('burns expired notes on access', () => {
		const note = newNote();
		store.create(note);
		expect(store.open(note.id, null, T0 + 2 * HOUR)).toMatchObject({
			status: 'burned',
			reason: 'expired'
		});
	});

	it('burns expired notes in the sweep and purges old tombstones', () => {
		const expired = newNote();
		const alive = newNote({ expiresAt: T0 + 48 * HOUR });
		store.create(expired);
		store.create(alive);

		expect(store.burnExpired(T0 + 2 * HOUR)).toBe(1);
		expect(store.peek(expired.id, T0 + 2 * HOUR)).toMatchObject({
			status: 'burned',
			reason: 'expired'
		});
		expect(store.peek(alive.id, T0 + 2 * HOUR).status).toBe('active');

		expect(store.purgeTombstones(T0 + 31 * 24 * HOUR)).toBe(1);
		expect(store.peek(expired.id, T0 + 2 * HOUR)).toEqual({ status: 'missing' });
	});

	describe('with a password', () => {
		const pwToken = randomBytes(32);
		const kdf = { alg: 'PBKDF2-SHA256' as const, iterations: 600_000, salt: 'A'.repeat(22) };

		it('releases the note only for the right token', () => {
			const note = newNote({ kdf, pwHash: hashToken(pwToken) });
			store.create(note);
			expect(store.peek(note.id, T0)).toMatchObject({ status: 'active', hasPassword: true, kdf });

			expect(store.open(note.id, null, T0)).toEqual({ status: 'wrong-password', attemptsLeft: 4 });
			expect(store.open(note.id, randomBytes(32), T0)).toEqual({
				status: 'wrong-password',
				attemptsLeft: 3
			});
			expect(store.open(note.id, pwToken, T0).status).toBe('ok');
		});

		it('burns the note after five wrong attempts', () => {
			const note = newNote({ kdf, pwHash: hashToken(pwToken), views: 3 });
			store.create(note);
			for (let i = 0; i < 4; i++) store.open(note.id, randomBytes(32), T0);
			expect(store.open(note.id, randomBytes(32), T0)).toMatchObject({
				status: 'burned',
				reason: 'password'
			});
			expect(store.open(note.id, pwToken, T0).status).toBe('burned');
		});
	});

	it('wipes everything but the tombstone when a note burns', () => {
		const db = openDatabase(':memory:');
		const local = new NoteStore(db, limits);
		const note = newNote({
			kdf: { alg: 'PBKDF2-SHA256', iterations: 600_000, salt: 'A'.repeat(22) }
		});
		local.create(note);
		local.open(note.id, null, T0);
		for (let i = 0; i < 5; i++) local.open(note.id, null, T0);

		const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(note.id);
		expect(row).toMatchObject({ ciphertext: null, iv: null, kdf: null, pw_hash: null });
	});

	it('refuses new notes when the database is full', () => {
		const tiny = new NoteStore(openDatabase(':memory:'), { ...limits, maxDbBytes: 1 });
		expect(tiny.create(newNote())).toBe('full');
	});
});
