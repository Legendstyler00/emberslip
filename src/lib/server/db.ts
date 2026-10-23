import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const migrations = [
	`
	CREATE TABLE notes (
		id BLOB PRIMARY KEY,
		ciphertext BLOB,
		iv BLOB,
		kdf TEXT,
		pw_hash BLOB,
		views_left INTEGER NOT NULL,
		failed_attempts INTEGER NOT NULL DEFAULT 0,
		expires_at INTEGER NOT NULL,
		burned_at INTEGER,
		burn_reason TEXT,
		purge_at INTEGER
	) STRICT, WITHOUT ROWID;
	CREATE INDEX notes_expiry ON notes (expires_at) WHERE burned_at IS NULL;
	CREATE INDEX notes_purge ON notes (purge_at) WHERE burned_at IS NOT NULL;
	`,
	`
	CREATE TABLE requests (
		id BLOB PRIMARY KEY,
		inbox_id BLOB NOT NULL UNIQUE,
		sealed_iv BLOB,
		sealed BLOB,
		kem_ciphertext BLOB,
		answer_iv BLOB,
		answer BLOB,
		expires_at INTEGER NOT NULL,
		answered_at INTEGER,
		burned_at INTEGER,
		burn_reason TEXT,
		purge_at INTEGER
	) STRICT, WITHOUT ROWID;
	CREATE INDEX requests_expiry ON requests (expires_at) WHERE burned_at IS NULL;
	CREATE INDEX requests_purge ON requests (purge_at) WHERE burned_at IS NOT NULL;
	`,
	// Opt-in status links. `opens` is a JSON array of minute-rounded times and stays NULL for
	// notes created without a status link, so nothing extra is recorded for them.
	`
	ALTER TABLE notes ADD COLUMN manage_hash BLOB;
	ALTER TABLE notes ADD COLUMN opens TEXT;
	CREATE UNIQUE INDEX notes_manage ON notes (manage_hash) WHERE manage_hash IS NOT NULL;
	`
];

export function openDatabase(path: string): DatabaseSync {
	if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
	const db = new DatabaseSync(path);
	db.exec('PRAGMA journal_mode = WAL');
	db.exec('PRAGMA synchronous = NORMAL');
	db.exec('PRAGMA busy_timeout = 5000');
	// Overwrite deleted content instead of leaving it in free pages.
	db.exec('PRAGMA secure_delete = ON');
	migrate(db);
	return db;
}

function migrate(db: DatabaseSync) {
	const { user_version: version } = db.prepare('PRAGMA user_version').get() as {
		user_version: number;
	};
	for (let i = version; i < migrations.length; i++) {
		transaction(db, () => {
			db.exec(migrations[i]);
			db.exec(`PRAGMA user_version = ${i + 1}`);
		});
	}
}

/** Runs `fn` in a write transaction. `fn` must be synchronous so nothing interleaves. */
export function transaction<T>(db: DatabaseSync, fn: () => T): T {
	db.exec('BEGIN IMMEDIATE');
	try {
		const result = fn();
		db.exec('COMMIT');
		return result;
	} catch (err) {
		db.exec('ROLLBACK');
		throw err;
	}
}

/** Bytes in use. The file never shrinks, so free pages left behind by burned notes don't count. */
export function databaseSize(db: DatabaseSync): number {
	const { page_count } = db.prepare('PRAGMA page_count').get() as { page_count: number };
	const { freelist_count } = db.prepare('PRAGMA freelist_count').get() as {
		freelist_count: number;
	};
	const { page_size } = db.prepare('PRAGMA page_size').get() as { page_size: number };
	return (page_count - freelist_count) * page_size;
}

/** Moves WAL content into the main file and truncates the WAL, so burned notes don't linger there. */
export function checkpoint(db: DatabaseSync) {
	db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
}
