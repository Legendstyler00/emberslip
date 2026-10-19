import { createHash, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync, StatementSync } from 'node:sqlite';
import type { PasswordKdf } from '../crypto/kdf';
import { databaseSize, transaction } from './db';

export type BurnReason = 'viewed' | 'expired' | 'password';

export interface NewNote {
	id: Uint8Array;
	iv: Uint8Array;
	ciphertext: Uint8Array;
	kdf: PasswordKdf | null;
	pwHash: Uint8Array | null;
	views: number;
	expiresAt: number;
}

export type Burned = { status: 'burned'; burnedAt: number; reason: BurnReason };
export type Missing = { status: 'missing' };

export type PeekResult =
	| {
			status: 'active';
			hasPassword: boolean;
			kdf: PasswordKdf | null;
			expiresAt: number;
			viewsLeft: number;
	  }
	| Burned
	| Missing;

export type OpenResult =
	| { status: 'ok'; iv: Uint8Array; ciphertext: Uint8Array; viewsLeft: number }
	| { status: 'wrong-password'; attemptsLeft: number }
	| Burned
	| Missing;

export interface NoteLimits {
	maxPasswordAttempts: number;
	tombstoneSeconds: number;
	maxDbBytes: number;
}

interface Row {
	ciphertext: Uint8Array | null;
	iv: Uint8Array | null;
	kdf: string | null;
	pw_hash: Uint8Array | null;
	views_left: number;
	failed_attempts: number;
	expires_at: number;
	burned_at: number | null;
	burn_reason: BurnReason | null;
}

/** Notes are looked up by the hash of a token, so the database never holds the token itself. */
export function hashToken(token: Uint8Array): Uint8Array {
	return createHash('sha256').update(token).digest();
}

// Tombstones only need to say roughly when a note burned.
function roundToMinute(ms: number): number {
	return Math.floor(ms / 60_000) * 60_000;
}

export class NoteStore {
	#db: DatabaseSync;
	#limits: NoteLimits;
	#insert: StatementSync;
	#select: StatementSync;
	#burn: StatementSync;
	#consumeView: StatementSync;
	#failAttempt: StatementSync;
	#burnExpired: StatementSync;
	#purge: StatementSync;

	constructor(db: DatabaseSync, limits: NoteLimits) {
		this.#db = db;
		this.#limits = limits;
		this.#insert = db.prepare(
			`INSERT INTO notes (id, ciphertext, iv, kdf, pw_hash, views_left, expires_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`
		);
		this.#select = db.prepare(
			`SELECT ciphertext, iv, kdf, pw_hash, views_left, failed_attempts, expires_at,
			        burned_at, burn_reason
			 FROM notes WHERE id = ?`
		);
		this.#burn = db.prepare(
			`UPDATE notes SET ciphertext = NULL, iv = NULL, kdf = NULL, pw_hash = NULL,
			        views_left = 0, burned_at = ?, burn_reason = ?, purge_at = ?
			 WHERE id = ?`
		);
		this.#consumeView = db.prepare(`UPDATE notes SET views_left = views_left - 1 WHERE id = ?`);
		this.#failAttempt = db.prepare(
			`UPDATE notes SET failed_attempts = failed_attempts + 1 WHERE id = ?`
		);
		this.#burnExpired = db.prepare(
			`UPDATE notes SET ciphertext = NULL, iv = NULL, kdf = NULL, pw_hash = NULL,
			        views_left = 0, burned_at = (expires_at / 60000) * 60000,
			        burn_reason = 'expired', purge_at = expires_at + ?
			 WHERE burned_at IS NULL AND expires_at <= ?`
		);
		this.#purge = db.prepare(`DELETE FROM notes WHERE burned_at IS NOT NULL AND purge_at <= ?`);
	}

	create(note: NewNote): 'created' | 'exists' | 'full' {
		if (databaseSize(this.#db) >= this.#limits.maxDbBytes) return 'full';
		const { changes } = this.#insert.run(
			note.id,
			note.ciphertext,
			note.iv,
			note.kdf ? JSON.stringify(note.kdf) : null,
			note.pwHash,
			note.views,
			note.expiresAt
		);
		return changes === 1 ? 'created' : 'exists';
	}

	/** Reports a note's state without using up a view. */
	peek(id: Uint8Array, now = Date.now()): PeekResult {
		return transaction(this.#db, () => {
			const row = this.#current(id, now);
			if ('status' in row) return row;
			return {
				status: 'active',
				hasPassword: row.pw_hash !== null,
				kdf: row.kdf ? (JSON.parse(row.kdf) as PasswordKdf) : null,
				expiresAt: row.expires_at,
				viewsLeft: row.views_left
			};
		});
	}

	/**
	 * Hands out the ciphertext and uses up one view, burning the note on its last one.
	 * A wrong password counts as a failed attempt; too many of them burn the note.
	 */
	open(id: Uint8Array, pwToken: Uint8Array | null, now = Date.now()): OpenResult {
		return transaction(this.#db, () => {
			const row = this.#current(id, now);
			if ('status' in row) return row;

			if (row.pw_hash !== null && !(pwToken && sameBytes(hashToken(pwToken), row.pw_hash))) {
				const attempts = row.failed_attempts + 1;
				if (attempts >= this.#limits.maxPasswordAttempts) {
					return this.#burnNote(id, now, 'password');
				}
				this.#failAttempt.run(id);
				return {
					status: 'wrong-password',
					attemptsLeft: this.#limits.maxPasswordAttempts - attempts
				};
			}

			const result = {
				status: 'ok' as const,
				iv: row.iv!,
				ciphertext: row.ciphertext!,
				viewsLeft: row.views_left - 1
			};
			if (result.viewsLeft === 0) this.#burnNote(id, now, 'viewed');
			else this.#consumeView.run(id);
			return result;
		});
	}

	burnExpired(now = Date.now()): number {
		return Number(this.#burnExpired.run(this.#limits.tombstoneSeconds * 1000, now).changes);
	}

	purgeTombstones(now = Date.now()): number {
		return Number(this.#purge.run(now).changes);
	}

	/** Loads a live note, or explains why there isn't one. Burns notes that have just expired. */
	#current(id: Uint8Array, now: number): Row | Burned | Missing {
		const row = this.#select.get(id) as Row | undefined;
		if (!row) return { status: 'missing' };
		if (row.burned_at !== null) {
			return { status: 'burned', burnedAt: row.burned_at, reason: row.burn_reason! };
		}
		if (row.expires_at <= now) return this.#burnNote(id, row.expires_at, 'expired');
		return row;
	}

	#burnNote(id: Uint8Array, at: number, reason: BurnReason): Burned {
		const burnedAt = roundToMinute(at);
		this.#burn.run(burnedAt, reason, at + this.#limits.tombstoneSeconds * 1000, id);
		return { status: 'burned', burnedAt, reason };
	}
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
	return a.length === b.length && timingSafeEqual(a, b);
}
