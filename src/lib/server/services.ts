import type { DatabaseSync } from 'node:sqlite';
import { config } from './config';
import { openDatabase } from './db';
import { NoteStore } from './notes';
import { RateLimiter } from './ratelimit';
import { RequestStore } from './requests';

let db: DatabaseSync | undefined;
let notes: NoteStore | undefined;
let requests: RequestStore | undefined;

export function database(): DatabaseSync {
	return (db ??= openDatabase(config.dbPath));
}

export function noteStore(): NoteStore {
	return (notes ??= new NoteStore(database(), config));
}

export function requestStore(): RequestStore {
	return (requests ??= new RequestStore(database(), config));
}

export const limits = {
	create: RateLimiter.perHour(config.rateLimit.createPerHour),
	read: RateLimiter.perMinute(config.rateLimit.readPerMinute)
};
