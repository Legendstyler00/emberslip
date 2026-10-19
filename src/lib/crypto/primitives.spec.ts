import { hkdfSync, pbkdf2Sync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { DecryptError, open, seal } from './aead';
import { fromBase64Url, randomBytes, toBase64Url, toHex } from './bytes';
import { decodeEnvelope, encodeEnvelope, EnvelopeTooLargeError, fitsInEnvelope } from './envelope';
import { hkdf, pbkdf2 } from './kdf';
import { pad, paddedSize, unpad } from './pad';

const hex = (s: string) => new Uint8Array(Buffer.from(s, 'hex'));

describe('base64url', () => {
	it('round-trips and matches Node', () => {
		for (const n of [0, 1, 2, 3, 31, 32, 33, 255]) {
			const bytes = randomBytes(n);
			const encoded = toBase64Url(bytes);
			expect(encoded).toBe(Buffer.from(bytes).toString('base64url'));
			expect(fromBase64Url(encoded)).toEqual(bytes);
		}
	});

	it('rejects invalid input', () => {
		expect(() => fromBase64Url('ab+c')).toThrow();
		expect(() => fromBase64Url('abc=')).toThrow();
		expect(() => fromBase64Url('a')).toThrow();
	});
});

describe('hkdf', () => {
	it('matches RFC 5869 test case 1', async () => {
		const okm = await hkdf(
			hex('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b'),
			hex('f0f1f2f3f4f5f6f7f8f9'),
			hex('000102030405060708090a0b0c'),
			42
		);
		expect(toHex(okm)).toBe(
			'3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865'
		);
	});

	it('matches Node with a string label and empty salt', async () => {
		const ikm = randomBytes(32);
		const expected = hkdfSync('sha256', ikm, new Uint8Array(0), 'emberslip/v1/test', 32);
		expect(await hkdf(ikm, 'emberslip/v1/test')).toEqual(new Uint8Array(expected));
	});
});

describe('pbkdf2', () => {
	it('matches Node', async () => {
		const salt = randomBytes(16);
		const expected = pbkdf2Sync('correct horse', salt, 1000, 32, 'sha256');
		expect(await pbkdf2('correct horse', salt, 1000)).toEqual(new Uint8Array(expected));
	});

	it('treats composed and decomposed Unicode the same', async () => {
		const salt = randomBytes(16);
		const composed = await pbkdf2('café', salt, 1000);
		const decomposed = await pbkdf2('café', salt, 1000);
		expect(composed).toEqual(decomposed);
	});
});

describe('aes-gcm', () => {
	it('round-trips and detects tampering', async () => {
		const key = randomBytes(32);
		const aad = new TextEncoder().encode('aad');
		const sealed = await seal(key, new TextEncoder().encode('hello'), aad);
		expect(new TextDecoder().decode(await open(key, sealed, aad))).toBe('hello');

		const flipped = sealed.ciphertext.slice();
		flipped[0] ^= 1;
		await expect(open(key, { ...sealed, ciphertext: flipped }, aad)).rejects.toThrow(DecryptError);
		await expect(open(key, sealed, new TextEncoder().encode('other'))).rejects.toThrow(
			DecryptError
		);
		await expect(open(randomBytes(32), sealed, aad)).rejects.toThrow(DecryptError);
	});

	it('uses a fresh IV every time', async () => {
		const key = randomBytes(32);
		const data = new Uint8Array(8);
		const a = await seal(key, data, data);
		const b = await seal(key, data, data);
		expect(a.iv).not.toEqual(b.iv);
	});
});

describe('padding', () => {
	it('uses power-of-two buckets starting at 1 KiB', () => {
		expect(paddedSize(0)).toBe(1024);
		expect(paddedSize(1020)).toBe(1024);
		expect(paddedSize(1021)).toBe(2048);
		expect(paddedSize(5000)).toBe(8192);
	});

	it('round-trips', () => {
		const data = randomBytes(1500);
		const padded = pad(data);
		expect(padded.length).toBe(2048);
		expect(unpad(padded)).toEqual(data);
	});

	it('rejects a length prefix larger than the buffer', () => {
		const padded = pad(new Uint8Array(10));
		new DataView(padded.buffer).setUint32(0, 5000);
		expect(() => unpad(padded)).toThrow();
	});
});

describe('envelope', () => {
	it('round-trips text', () => {
		const text = 'p4ssw0rd ✓\nline two';
		expect(decodeEnvelope(encodeEnvelope(text)).text).toBe(text);
	});

	it('rejects notes larger than 64 KiB padded', () => {
		const text = 'x'.repeat(70_000);
		expect(fitsInEnvelope(text)).toBe(false);
		expect(() => encodeEnvelope(text)).toThrow(EnvelopeTooLargeError);
		expect(fitsInEnvelope('x'.repeat(60_000))).toBe(true);
	});

	it('rejects unknown formats', () => {
		const bogus = pad(new TextEncoder().encode(JSON.stringify({ v: 2, text: 'x' })));
		expect(() => decodeEnvelope(bogus)).toThrow();
	});
});
