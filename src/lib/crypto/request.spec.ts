import { describe, expect, it } from 'vitest';
import { DecryptError } from './aead';
import { fromBase64Url, randomBytes, toBase64Url } from './bytes';
import { decapsulate, encapsulate, KEM_CIPHERTEXT_BYTES, publicKeyFromSeed } from './kem';
import {
	createRequest,
	decryptAnswer,
	deriveInboxToken,
	deriveRespondToken,
	encryptAnswer,
	openRequest,
	parseSecret
} from './request';

describe('X-Wing KEM', () => {
	it('derives the same key pair from the same seed', () => {
		const seed = randomBytes(32);
		expect(publicKeyFromSeed(seed)).toEqual(publicKeyFromSeed(seed));
		expect(publicKeyFromSeed(seed)).toHaveLength(1216);
	});

	it('agrees on a shared secret only with the right seed', () => {
		const seed = randomBytes(32);
		const { cipherText, sharedSecret } = encapsulate(publicKeyFromSeed(seed));
		expect(cipherText).toHaveLength(KEM_CIPHERTEXT_BYTES);
		expect(decapsulate(cipherText, seed)).toEqual(sharedSecret);
		expect(decapsulate(cipherText, randomBytes(32))).not.toEqual(sharedSecret);
	});
});

describe('request protocol', () => {
	it('round-trips a request and its answer', async () => {
		const { shareSecret, seed, payload } = await createRequest('Please send the staging password');
		expect(payload.respondToken).toBe(await deriveRespondToken(shareSecret));
		expect(payload.inboxToken).toBe(await deriveInboxToken(seed));

		const request = await openRequest(shareSecret, payload.sealedIv, payload.sealed);
		expect(request.message).toBe('Please send the staging password');
		expect(request.publicKey).toEqual(publicKeyFromSeed(seed));

		const answer = await encryptAnswer(request.publicKey, 'staging: s3cr3t');
		expect(await decryptAnswer(seed, answer)).toBe('staging: s3cr3t');
	});

	it('cannot be opened without the share secret', async () => {
		const { payload } = await createRequest('hi');
		await expect(openRequest(randomBytes(32), payload.sealedIv, payload.sealed)).rejects.toThrow(
			DecryptError
		);
	});

	it('detects a swapped public key', async () => {
		const { shareSecret, payload } = await createRequest('hi');
		const sealed = fromBase64Url(payload.sealed);
		sealed[10] ^= 1;
		await expect(openRequest(shareSecret, payload.sealedIv, toBase64Url(sealed))).rejects.toThrow(
			DecryptError
		);
	});

	it('only the requester can read the answer', async () => {
		const { shareSecret, payload } = await createRequest('');
		const { publicKey } = await openRequest(shareSecret, payload.sealedIv, payload.sealed);
		const answer = await encryptAnswer(publicKey, 'secret');
		await expect(decryptAnswer(randomBytes(32), answer)).rejects.toThrow(DecryptError);
	});

	it('pads the sealed request to hide the message length', async () => {
		const short = await createRequest('');
		const long = await createRequest('x'.repeat(500));
		expect(fromBase64Url(short.payload.sealed)).toHaveLength(1216 + 1024 + 16);
		expect(fromBase64Url(long.payload.sealed)).toHaveLength(1216 + 1024 + 16);
	});

	it('rejects overly long messages', async () => {
		await expect(createRequest('x'.repeat(501))).rejects.toThrow();
	});

	it('parses secrets from fragments', () => {
		const secret = randomBytes(32);
		expect(parseSecret(`#${toBase64Url(secret)}`, 32)).toEqual(secret);
		expect(parseSecret('#abc', 32)).toBeNull();
	});
});
