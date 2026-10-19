import type { DatabaseSync } from 'node:sqlite';
import { config } from './config';
import { openDatabase } from './db';
import { NoteStore } from './notes';
import { RateLimiter } from './ratelimit';

let db: DatabaseSync | undefined;
let notes: NoteStore | undefined;

export function database(): DatabaseSync {
	return (db ??= openDatabase(config.dbPath));
}

export function noteStore(): NoteStore {
	return (notes ??= new NoteStore(database(), config));
}

export const limits = {
	create: RateLimiter.perHour(config.rateLimit.createPerHour),
	read: RateLimiter.perMinute(config.rateLimit.readPerMinute)
};
