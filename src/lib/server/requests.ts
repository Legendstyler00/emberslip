import type { DatabaseSync, StatementSync } from 'node:sqlite';
import { databaseSize, transaction } from './db';
import { roundToMinute, type Missing } from './notes';

export interface NewRequest {
	id: Uint8Array;
	inboxId: Uint8Array;
	sealedIv: Uint8Array;
	sealed: Uint8Array;
	expiresAt: number;
}

export interface Answer {
	kemCiphertext: Uint8Array;
	iv: Uint8Array;
	ciphertext: Uint8Array;
}

/** What the person who was asked for a secret gets to see. */
export type RespondView =
	| { status: 'open'; sealedIv: Uint8Array; sealed: Uint8Array; expiresAt: number }
	| { status: 'answered' }
	| { status: 'expired' }
	| Missing;

/** What the person who asked gets to see. */
export type InboxView =
	| { status: 'waiting'; expiresAt: number }
	| { status: 'answered'; answeredAt: number; expiresAt: number }
	| { status: 'burned'; burnedAt: number; reason: 'viewed' | 'expired' }
	| Missing;

export type OpenAnswer = ({ status: 'ok' } & Answer) | Exclude<InboxView, { status: 'answered' }>;

export interface RequestLimits {
	tombstoneSeconds: number;
	maxDbBytes: number;
	/** How long an answer waits to be read. */
	maxTtlSeconds: number;
}

interface Row {
	id: Uint8Array;
	sealed_iv: Uint8Array | null;
	sealed: Uint8Array | null;
	kem_ciphertext: Uint8Array | null;
	answer_iv: Uint8Array | null;
	answer: Uint8Array | null;
	expires_at: number;
	answered_at: number | null;
	burned_at: number | null;
	burn_reason: 'viewed' | 'expired' | null;
}

const COLUMNS = `id, sealed_iv, sealed, kem_ciphertext, answer_iv, answer, expires_at, answered_at,
	burned_at, burn_reason`;

export class RequestStore {
	#db: DatabaseSync;
	#limits: RequestLimits;
	#insert: StatementSync;
	#byId: StatementSync;
	#byInbox: StatementSync;
	#answer: StatementSync;
	#burn: StatementSync;
	#burnExpired: StatementSync;
	#purge: StatementSync;

	constructor(db: DatabaseSync, limits: RequestLimits) {
		this.#db = db;
		this.#limits = limits;
		this.#insert = db.prepare(
			`INSERT INTO requests (id, inbox_id, sealed_iv, sealed, expires_at)
			 VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`
		);
		this.#byId = db.prepare(`SELECT ${COLUMNS} FROM requests WHERE id = ?`);
		this.#byInbox = db.prepare(`SELECT ${COLUMNS} FROM requests WHERE inbox_id = ?`);
		this.#answer = db.prepare(
			`UPDATE requests SET sealed_iv = NULL, sealed = NULL, kem_ciphertext = ?, answer_iv = ?,
			        answer = ?, answered_at = ?, expires_at = ?
			 WHERE id = ?`
		);
		this.#burn = db.prepare(
			`UPDATE requests SET sealed_iv = NULL, sealed = NULL, kem_ciphertext = NULL,
			        answer_iv = NULL, answer = NULL, burned_at = ?, burn_reason = ?, purge_at = ?
			 WHERE id = ?`
		);
		this.#burnExpired = db.prepare(
			`UPDATE requests SET sealed_iv = NULL, sealed = NULL, kem_ciphertext = NULL,
			        answer_iv = NULL, answer = NULL, burned_at = (expires_at / 60000) * 60000,
			        burn_reason = 'expired', purge_at = expires_at + ?
			 WHERE burned_at IS NULL AND expires_at <= ?`
		);
		this.#purge = db.prepare(`DELETE FROM requests WHERE burned_at IS NOT NULL AND purge_at <= ?`);
	}

	create(request: NewRequest): 'created' | 'exists' | 'full' {
		if (databaseSize(this.#db) >= this.#limits.maxDbBytes) return 'full';
		const { changes } = this.#insert.run(
			request.id,
			request.inboxId,
			request.sealedIv,
			request.sealed,
			request.expiresAt
		);
		return changes === 1 ? 'created' : 'exists';
	}

	respondView(id: Uint8Array, now = Date.now()): RespondView {
		return transaction(this.#db, () => {
			const row = this.#current(this.#byId.get(id) as Row | undefined, now);
			if (!row) return { status: 'missing' };
			if (row.answered_at !== null) return { status: 'answered' };
			if (row.burned_at !== null) return { status: 'expired' };
			return {
				status: 'open',
				sealedIv: row.sealed_iv!,
				sealed: row.sealed!,
				expiresAt: row.expires_at
			};
		});
	}

	/** Stores the answer, once. The sealed request is no longer needed after that. */
	fulfill(id: Uint8Array, answer: Answer, now = Date.now()): RespondView['status'] {
		return transaction(this.#db, () => {
			const row = this.#current(this.#byId.get(id) as Row | undefined, now);
			if (!row) return 'missing';
			if (row.answered_at !== null) return 'answered';
			if (row.burned_at !== null) return 'expired';
			this.#answer.run(
				answer.kemCiphertext,
				answer.iv,
				answer.ciphertext,
				roundToMinute(now),
				now + this.#limits.maxTtlSeconds * 1000,
				id
			);
			return 'open';
		});
	}

	inboxView(inboxId: Uint8Array, now = Date.now()): InboxView {
		return transaction(this.#db, () => this.#inbox(inboxId, now));
	}

	/** Hands out the answer once and burns the request. */
	openAnswer(inboxId: Uint8Array, now = Date.now()): OpenAnswer {
		return transaction(this.#db, () => {
			const view = this.#inbox(inboxId, now);
			if (view.status !== 'answered') return view;
			const row = this.#byInbox.get(inboxId) as unknown as Row;
			this.#burnRow(row.id, now, 'viewed');
			return {
				status: 'ok',
				kemCiphertext: row.kem_ciphertext!,
				iv: row.answer_iv!,
				ciphertext: row.answer!
			};
		});
	}

	burnExpired(now = Date.now()): number {
		return Number(this.#burnExpired.run(this.#limits.tombstoneSeconds * 1000, now).changes);
	}

	purgeTombstones(now = Date.now()): number {
		return Number(this.#purge.run(now).changes);
	}

	#inbox(inboxId: Uint8Array, now: number): InboxView {
		const row = this.#current(this.#byInbox.get(inboxId) as Row | undefined, now);
		if (!row) return { status: 'missing' };
		if (row.burned_at !== null) {
			return { status: 'burned', burnedAt: row.burned_at, reason: row.burn_reason! };
		}
		if (row.answered_at !== null) {
			return { status: 'answered', answeredAt: row.answered_at, expiresAt: row.expires_at };
		}
		return { status: 'waiting', expiresAt: row.expires_at };
	}

	/** Burns the request if it has just expired, and returns its current state. */
	#current(row: Row | undefined, now: number): Row | undefined {
		if (!row || row.burned_at !== null || row.expires_at > now) return row;
		const burnedAt = this.#burnRow(row.id, row.expires_at, 'expired');
		return { ...row, burned_at: burnedAt, burn_reason: 'expired' };
	}

	#burnRow(id: Uint8Array, at: number, reason: 'viewed' | 'expired'): number {
		const burnedAt = roundToMinute(at);
		this.#burn.run(burnedAt, reason, at + this.#limits.tombstoneSeconds * 1000, id);
		return burnedAt;
	}
}
