import { hkdfSync, pbkdf2Sync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { DecryptError } from './aead';
import { fromBase64Url, toBase64Url } from './bytes';
import {
	decryptNote,
	deriveLinkToken,
	deriveNoteSecrets,
	encryptNote,
	generateNoteKey,
	parseNoteKey
} from './note';

const fixedKey = new Uint8Array(32).map((_, i) => i);

describe('note protocol', () => {
	it('derives the link token as HKDF(K, "emberslip/v1/link")', async () => {
		const expected = hkdfSync('sha256', fixedKey, new Uint8Array(0), 'emberslip/v1/link', 32);
		expect(await deriveLinkToken(fixedKey)).toBe(Buffer.from(expected).toString('base64url'));
	});

	it('derives password secrets as specified', async () => {
		const kdf = {
			alg: 'PBKDF2-SHA256' as const,
			iterations: 100_000,
			salt: 'AAAAAAAAAAAAAAAAAAAAAA'
		};
		const passwordKey = pbkdf2Sync('hunter2', fromBase64Url(kdf.salt), 100_000, 32, 'sha256');
		const encKey = hkdfSync('sha256', fixedKey, passwordKey, 'emberslip/v1/enc', 32);
		const pwToken = hkdfSync('sha256', fixedKey, passwordKey, 'emberslip/v1/pw', 32);

		const secrets = await deriveNoteSecrets(fixedKey, kdf, 'hunter2');
		expect(secrets.encKey).toEqual(new Uint8Array(encKey));
		expect(secrets.pwToken).toBe(Buffer.from(pwToken).toString('base64url'));
	});

	it('round-trips a note without a password', async () => {
		const key = generateNoteKey();
		const payload = await encryptNote(key, 'the vault code is 4711', null);
		expect(payload.kdf).toBeNull();
		expect(payload.pwToken).toBeNull();
		expect(payload.linkToken).toBe(await deriveLinkToken(key));

		const secrets = await deriveNoteSecrets(key, null, null);
		expect(await decryptNote(secrets, null, payload.iv, payload.ciphertext)).toBe(
			'the vault code is 4711'
		);
	});

	it('round-trips a note with a password and rejects the wrong one', async () => {
		const key = generateNoteKey();
		const payload = await encryptNote(key, 'secret', 'open sesame');
		expect(payload.kdf?.iterations).toBe(600_000);

		const right = await deriveNoteSecrets(key, payload.kdf, 'open sesame');
		expect(right.pwToken).toBe(payload.pwToken);
		expect(await decryptNote(right, payload.kdf, payload.iv, payload.ciphertext)).toBe('secret');

		const wrong = await deriveNoteSecrets(key, payload.kdf, 'open sesame!');
		expect(wrong.pwToken).not.toBe(payload.pwToken);
		await expect(decryptNote(wrong, payload.kdf, payload.iv, payload.ciphertext)).rejects.toThrow(
			DecryptError
		);
	});

	it('fails if the server swaps the password settings', async () => {
		const key = generateNoteKey();
		const payload = await encryptNote(key, 'secret', null);
		const secrets = await deriveNoteSecrets(key, null, null);
		const fakeKdf = { alg: 'PBKDF2-SHA256' as const, iterations: 100_000, salt: 'A'.repeat(22) };
		await expect(decryptNote(secrets, fakeKdf, payload.iv, payload.ciphertext)).rejects.toThrow(
			DecryptError
		);
	});

	it('refuses unreasonable password settings', async () => {
		const key = generateNoteKey();
		const slow = { alg: 'PBKDF2-SHA256' as const, iterations: 1e12, salt: 'A'.repeat(22) };
		await expect(deriveNoteSecrets(key, slow, 'pw')).rejects.toThrow();
	});

	it('hides the exact note length', async () => {
		const key = generateNoteKey();
		const short = await encryptNote(key, 'a', null);
		const longer = await encryptNote(key, 'a'.repeat(900), null);
		expect(fromBase64Url(short.ciphertext).length).toBe(1024 + 16);
		expect(fromBase64Url(longer.ciphertext).length).toBe(1024 + 16);
	});

	it('parses keys from link fragments', () => {
		const key = generateNoteKey();
		expect(parseNoteKey(`#${toBase64Url(key)}`)).toEqual(key);
		expect(parseNoteKey(toBase64Url(key))).toEqual(key);
		expect(parseNoteKey(toBase64Url(key).slice(0, -2))).toBeNull();
		expect(parseNoteKey('#not valid!')).toBeNull();
		expect(parseNoteKey('')).toBeNull();
	});
});
