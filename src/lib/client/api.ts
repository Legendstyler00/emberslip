import type { PasswordKdf } from '../crypto/kdf';
import type { NotePayload } from '../crypto/note';

export type BurnReason = 'viewed' | 'expired' | 'password';

export type Burned = { status: 'burned'; burnedAt: number; reason: BurnReason };
export type Missing = { status: 'missing' };

export type PeekResponse =
	| {
			status: 'active';
			hasPassword: boolean;
			kdf: PasswordKdf | null;
			expiresAt: number;
			viewsLeft: number;
	  }
	| Burned
	| Missing;

export type OpenResponse =
	| { status: 'ok'; iv: string; ciphertext: string; viewsLeft: number }
	| { status: 'wrong-password'; attemptsLeft: number }
	| Burned
	| Missing;

export class ApiRequestError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

async function post(path: string, body: unknown): Promise<{ status: number; data: unknown }> {
	let res: Response;
	try {
		res = await fetch(path, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
			cache: 'no-store',
			credentials: 'omit',
			referrerPolicy: 'no-referrer'
		});
	} catch {
		throw new ApiRequestError(
			0,
			'Could not reach the server. Check your connection and try again.'
		);
	}
	return { status: res.status, data: await res.json().catch(() => null) };
}

function failure(status: number, data: unknown): ApiRequestError {
	const message =
		data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
			? data.error
			: 'Something went wrong. Please try again.';
	return new ApiRequestError(status, message);
}

function hasStatus<T>(data: unknown): data is T {
	return !!data && typeof data === 'object' && 'status' in data;
}

export async function createNote(
	payload: NotePayload & { views: number; ttl: number }
): Promise<{ expiresAt: number; views: number }> {
	const { status, data } = await post('/api/notes', payload);
	if (status !== 201) throw failure(status, data);
	return data as { expiresAt: number; views: number };
}

export async function peekNote(linkToken: string): Promise<PeekResponse> {
	const { status, data } = await post('/api/notes/peek', { linkToken });
	if ([200, 404, 410].includes(status) && hasStatus<PeekResponse>(data)) return data;
	throw failure(status, data);
}

export async function openNote(linkToken: string, pwToken: string | null): Promise<OpenResponse> {
	const { status, data } = await post('/api/notes/open', { linkToken, pwToken });
	if ([200, 403, 404, 410].includes(status) && hasStatus<OpenResponse>(data)) return data;
	throw failure(status, data);
}
