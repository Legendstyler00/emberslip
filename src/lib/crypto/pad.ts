import type { Bytes } from './bytes';

const MIN_BUCKET = 1024;
const PREFIX = 4;

/** Size a payload of `length` bytes occupies once padded. */
export function paddedSize(length: number): number {
	let size = MIN_BUCKET;
	while (size < length + PREFIX) size *= 2;
	return size;
}

/**
 * Prefixes the payload with its length and zero-fills it up to the next power of two,
 * so the ciphertext only reveals a rough size class.
 */
export function pad(data: Uint8Array): Bytes {
	const out = new Uint8Array(paddedSize(data.length));
	new DataView(out.buffer).setUint32(0, data.length);
	out.set(data, PREFIX);
	return out;
}

export function unpad(padded: Bytes): Bytes {
	if (padded.length < PREFIX) throw new Error('Invalid padding');
	const length = new DataView(padded.buffer, padded.byteOffset).getUint32(0);
	if (length > padded.length - PREFIX) throw new Error('Invalid padding');
	return padded.slice(PREFIX, PREFIX + length);
}
