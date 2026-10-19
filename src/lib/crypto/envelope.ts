import { fromUtf8, utf8, type Bytes } from './bytes';
import { pad, paddedSize, unpad } from './pad';

/** What actually gets encrypted. Kept as an object so attachments can be added later. */
export interface Envelope {
	v: 1;
	text: string;
}

/** Largest padded envelope the server accepts (ciphertext adds 16 bytes for the tag). */
export const MAX_PADDED_SIZE = 64 * 1024;

export class EnvelopeTooLargeError extends Error {
	constructor() {
		super('Note is too long');
		this.name = 'EnvelopeTooLargeError';
	}
}

export function encodeEnvelope(text: string): Bytes {
	const data = utf8(JSON.stringify({ v: 1, text } satisfies Envelope));
	if (paddedSize(data.length) > MAX_PADDED_SIZE) throw new EnvelopeTooLargeError();
	return pad(data);
}

export function fitsInEnvelope(text: string): boolean {
	return paddedSize(utf8(JSON.stringify({ v: 1, text })).length) <= MAX_PADDED_SIZE;
}

export function decodeEnvelope(padded: Bytes): Envelope {
	const parsed: unknown = JSON.parse(fromUtf8(unpad(padded)));
	if (
		typeof parsed !== 'object' ||
		parsed === null ||
		(parsed as Envelope).v !== 1 ||
		typeof (parsed as Envelope).text !== 'string'
	) {
		throw new Error('Unsupported note format');
	}
	return { v: 1, text: (parsed as Envelope).text };
}
