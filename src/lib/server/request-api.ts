import { toBase64Url } from '../crypto/bytes';
import type { InboxView, OpenAnswer, RespondView } from './requests';

const KEM_PUBLIC_KEY_BYTES = 1216;
const GCM_TAG_BYTES = 16;

/** The sealed public key plus a padded message of at most 4 KiB. */
export function isSealedRequest(length: number): boolean {
	const padded = length - KEM_PUBLIC_KEY_BYTES - GCM_TAG_BYTES;
	return [1024, 2048, 4096].includes(padded);
}

export function respondStatusCode(status: RespondView['status']): number {
	return { open: 200, answered: 409, expired: 410, missing: 404 }[status];
}

export function serializeRespondView(view: RespondView) {
	if (view.status !== 'open') return { status: view.status };
	return {
		status: view.status,
		sealedIv: toBase64Url(view.sealedIv),
		sealed: toBase64Url(view.sealed),
		expiresAt: view.expiresAt
	};
}

export function inboxStatusCode(view: InboxView | OpenAnswer): number {
	return { ok: 200, answered: 200, waiting: 200, burned: 410, missing: 404 }[view.status];
}

export function serializeOpenAnswer(answer: OpenAnswer) {
	if (answer.status !== 'ok') return answer;
	return {
		status: answer.status,
		kemCiphertext: toBase64Url(answer.kemCiphertext),
		iv: toBase64Url(answer.iv),
		ciphertext: toBase64Url(answer.ciphertext)
	};
}
