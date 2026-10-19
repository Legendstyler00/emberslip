import { open, seal } from './aead';
import { concat, fromBase64Url, randomBytes, toBase64Url, utf8, type Bytes } from './bytes';
import { decodeEnvelope, encodeEnvelope } from './envelope';
import { hkdf, label } from './kdf';
import {
	decapsulate,
	encapsulate,
	KEM_CIPHERTEXT_BYTES,
	KEM_PUBLIC_KEY_BYTES,
	KEM_SEED_BYTES,
	publicKeyFromSeed
} from './kem';

/**
 * A request has two secrets:
 * - the share secret goes into the link sent to whoever should answer, and
 * - the inbox seed, from which the KEM key pair is derived, stays with the requester.
 * The KEM public key is too long for a link, so it is stored on the server, sealed under
 * a key from the share secret. The server can't read or replace it.
 */
export const SHARE_SECRET_BYTES = 32;
export const MAX_REQUEST_MESSAGE_LENGTH = 500;

export interface RequestPayload {
	respondToken: string;
	inboxToken: string;
	sealedIv: string;
	sealed: string;
}

export interface AnswerPayload {
	kemCiphertext: string;
	iv: string;
	ciphertext: string;
}

const sealAad = utf8(label('request/seal'));
const answerAad = utf8(label('request/answer'));

export function parseSecret(fragment: string, length: number): Bytes | null {
	try {
		const bytes = fromBase64Url(fragment.replace(/^#/, ''));
		return bytes.length === length ? bytes : null;
	} catch {
		return null;
	}
}

export async function deriveRespondToken(shareSecret: Bytes): Promise<string> {
	return toBase64Url(await hkdf(shareSecret, label('request/respond')));
}

export async function deriveInboxToken(seed: Bytes): Promise<string> {
	return toBase64Url(await hkdf(seed, label('request/inbox')));
}

export async function createRequest(message: string): Promise<{
	shareSecret: Bytes;
	seed: Bytes;
	payload: RequestPayload;
}> {
	if (message.length > MAX_REQUEST_MESSAGE_LENGTH) throw new Error('Message is too long');
	const shareSecret = randomBytes(SHARE_SECRET_BYTES);
	const seed = randomBytes(KEM_SEED_BYTES);
	const publicKey = publicKeyFromSeed(seed);

	const sealKey = await hkdf(shareSecret, label('request/seal'));
	const sealed = await seal(sealKey, concat(publicKey, encodeEnvelope(message)), sealAad);
	const [respondToken, inboxToken] = await Promise.all([
		deriveRespondToken(shareSecret),
		deriveInboxToken(seed)
	]);
	return {
		shareSecret,
		seed,
		payload: {
			respondToken,
			inboxToken,
			sealedIv: toBase64Url(sealed.iv),
			sealed: toBase64Url(sealed.ciphertext)
		}
	};
}

export async function openRequest(
	shareSecret: Bytes,
	sealedIv: string,
	sealed: string
): Promise<{ publicKey: Bytes; message: string }> {
	const sealKey = await hkdf(shareSecret, label('request/seal'));
	const plaintext = await open(
		sealKey,
		{ iv: fromBase64Url(sealedIv), ciphertext: fromBase64Url(sealed) },
		sealAad
	);
	return {
		publicKey: plaintext.slice(0, KEM_PUBLIC_KEY_BYTES),
		message: decodeEnvelope(plaintext.slice(KEM_PUBLIC_KEY_BYTES)).text
	};
}

export async function encryptAnswer(publicKey: Bytes, text: string): Promise<AnswerPayload> {
	const { cipherText, sharedSecret } = encapsulate(publicKey);
	const key = await hkdf(sharedSecret, label('request/answer'));
	const sealed = await seal(key, encodeEnvelope(text), answerAad);
	return {
		kemCiphertext: toBase64Url(cipherText),
		iv: toBase64Url(sealed.iv),
		ciphertext: toBase64Url(sealed.ciphertext)
	};
}

export async function decryptAnswer(seed: Bytes, answer: AnswerPayload): Promise<string> {
	const kemCiphertext = fromBase64Url(answer.kemCiphertext);
	if (kemCiphertext.length !== KEM_CIPHERTEXT_BYTES) throw new Error('Invalid answer');
	const key = await hkdf(decapsulate(kemCiphertext, seed), label('request/answer'));
	const plaintext = await open(
		key,
		{ iv: fromBase64Url(answer.iv), ciphertext: fromBase64Url(answer.ciphertext) },
		answerAad
	);
	return decodeEnvelope(plaintext).text;
}
