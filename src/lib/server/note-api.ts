import { toBase64Url } from '../crypto/bytes';
import { MAX_PADDED_SIZE } from '../crypto/envelope';
import type { OpenResult } from './notes';

/** Base64url JSON with some headroom; anything larger can't be a valid note. */
export const MAX_REQUEST_BYTES = Math.ceil(((MAX_PADDED_SIZE + 16) * 4) / 3) + 4096;

/** Padded envelopes come in power-of-two sizes, plus the 16-byte GCM tag. */
export function isPaddedCiphertext(length: number): boolean {
	const padded = length - 16;
	return padded >= 1024 && padded <= MAX_PADDED_SIZE && (padded & (padded - 1)) === 0;
}

export function statusCode(result: { status: string }): number {
	switch (result.status) {
		case 'missing':
			return 404;
		case 'burned':
			return 410;
		case 'wrong-password':
			return 403;
		default:
			return 200;
	}
}

export function serializeOpen(result: OpenResult) {
	if (result.status !== 'ok') return result;
	return {
		status: result.status,
		iv: toBase64Url(result.iv),
		ciphertext: toBase64Url(result.ciphertext),
		viewsLeft: result.viewsLeft
	};
}
