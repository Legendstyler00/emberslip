import type { PasswordKdf } from '../crypto/kdf';
import type { NotePayload } from '../crypto/note';
import type { AnswerPayload, RequestPayload } from '../crypto/request';

export type BurnReason = 'viewed' | 'expired' | 'password' | 'creator';

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

export type ManageResponse =
	| {
			status: 'active';
			viewsLeft: number;
			expiresAt: number;
			hasPassword: boolean;
			failedAttempts: number;
			opens: number[];
	  }
	| (Burned & { failedAttempts: number; opens: number[] })
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
	payload: NotePayload & { views: number; ttl: number; manageToken: string | null }
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

export async function noteStatus(manageToken: string): Promise<ManageResponse> {
	const { status, data } = await post('/api/notes/status', { manageToken });
	if ([200, 404, 410].includes(status) && hasStatus<ManageResponse>(data)) return data;
	throw failure(status, data);
}

export async function burnNote(manageToken: string): Promise<ManageResponse> {
	const { status, data } = await post('/api/notes/burn', { manageToken });
	if ([200, 404, 410].includes(status) && hasStatus<ManageResponse>(data)) return data;
	throw failure(status, data);
}

export type RespondResponse =
	| { status: 'open'; sealedIv: string; sealed: string; expiresAt: number }
	| { status: 'answered' }
	| { status: 'expired' }
	| Missing;

export type InboxResponse =
	| { status: 'waiting'; expiresAt: number }
	| { status: 'answered'; answeredAt: number; expiresAt: number }
	| { status: 'burned'; burnedAt: number; reason: 'viewed' | 'expired' }
	| Missing;

export type OpenAnswerResponse =
	({ status: 'ok' } & AnswerPayload) | Exclude<InboxResponse, { status: 'answered' }>;

async function postExpecting<T>(path: string, body: unknown, accepted: number[]): Promise<T> {
	const { status, data } = await post(path, body);
	if (accepted.includes(status) && hasStatus<T>(data)) return data;
	throw failure(status, data);
}

export async function createSecretRequest(
	payload: RequestPayload & { ttl: number }
): Promise<{ expiresAt: number }> {
	const { status, data } = await post('/api/requests', payload);
	if (status !== 201) throw failure(status, data);
	return data as { expiresAt: number };
}

export function peekRequest(respondToken: string): Promise<RespondResponse> {
	return postExpecting('/api/requests/peek', { respondToken }, [200, 404, 409, 410]);
}

export async function sendAnswer(
	respondToken: string,
	answer: AnswerPayload
): Promise<{ status: 'sent' | 'answered' | 'expired' | 'missing' }> {
	return postExpecting('/api/requests/fulfill', { respondToken, ...answer }, [201, 404, 409, 410]);
}

export function checkInbox(inboxToken: string): Promise<InboxResponse> {
	return postExpecting('/api/requests/inbox', { inboxToken }, [200, 404, 410]);
}

export function openAnswer(inboxToken: string): Promise<OpenAnswerResponse> {
	return postExpecting('/api/requests/open', { inboxToken }, [200, 404, 410]);
}
