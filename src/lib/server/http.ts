import { json, type RequestEvent, type RequestHandler } from '@sveltejs/kit';
import { fromBase64Url } from '../crypto/bytes';
import { isAcceptableKdf } from '../crypto/note';
import type { PasswordKdf } from '../crypto/kdf';
import { clientKey, type RateLimiter } from './ratelimit';

export class ApiError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

export function reply(body: unknown, status = 200): Response {
	return json(body, { status, headers: { 'cache-control': 'no-store' } });
}

/** Wraps a handler so thrown ApiErrors become JSON error responses. */
export function api(handler: RequestHandler): RequestHandler {
	return async (event) => {
		try {
			return await handler(event);
		} catch (err) {
			if (err instanceof ApiError) return reply({ error: err.message }, err.status);
			throw err;
		}
	};
}

export function limit(limiter: RateLimiter, event: RequestEvent) {
	if (!limiter.take(clientKey(event.getClientAddress()))) {
		throw new ApiError(429, 'Too many requests, slow down a little');
	}
}

export type Body = Record<string, unknown>;

export async function readJson(request: Request, maxBytes: number): Promise<Body> {
	if (Number(request.headers.get('content-length') ?? 0) > maxBytes) {
		throw new ApiError(413, 'Request is too large');
	}
	const text = await request.text();
	if (text.length > maxBytes) throw new ApiError(413, 'Request is too large');
	let body: unknown;
	try {
		body = JSON.parse(text);
	} catch {
		throw new ApiError(400, 'Request body must be JSON');
	}
	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		throw new ApiError(400, 'Request body must be a JSON object');
	}
	return body as Body;
}

export function bytesField(
	body: Body,
	name: string,
	size: { length: number } | { max: number }
): Uint8Array {
	const value = body[name];
	let bytes: Uint8Array | undefined;
	if (typeof value === 'string') {
		try {
			bytes = fromBase64Url(value);
		} catch {
			// handled below
		}
	}
	if (
		!bytes ||
		('length' in size && bytes.length !== size.length) ||
		('max' in size && bytes.length > size.max)
	) {
		throw new ApiError(400, `Invalid ${name}`);
	}
	return bytes;
}

export function optionalBytesField(body: Body, name: string, length: number): Uint8Array | null {
	return body[name] === undefined || body[name] === null
		? null
		: bytesField(body, name, { length });
}

export function intField(body: Body, name: string, min: number, max: number): number {
	const value = body[name];
	if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
		throw new ApiError(400, `${name} must be a whole number from ${min} to ${max}`);
	}
	return value;
}

export function kdfField(body: Body): PasswordKdf | null {
	const value = body.kdf;
	if (value === undefined || value === null) return null;
	if (typeof value !== 'object') throw new ApiError(400, 'Invalid kdf');
	const { alg, iterations, salt } = value as Record<string, unknown>;
	const kdf = { alg, iterations, salt } as PasswordKdf;
	if (!isAcceptableKdf(kdf)) throw new ApiError(400, 'Invalid kdf');
	return kdf;
}
