import { randomBytes, type Bytes } from './bytes';

export class DecryptError extends Error {
	constructor() {
		super('Decryption failed');
		this.name = 'DecryptError';
	}
}

export interface Sealed {
	iv: Bytes;
	ciphertext: Bytes;
}

function importKey(key: Bytes, usage: KeyUsage): Promise<CryptoKey> {
	return crypto.subtle.importKey('raw', key, 'AES-GCM', false, [usage]);
}

// Every key is used for exactly one message, so a random IV is safe here.
export async function seal(key: Bytes, plaintext: Bytes, aad: Bytes): Promise<Sealed> {
	const iv = randomBytes(12);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv, additionalData: aad },
		await importKey(key, 'encrypt'),
		plaintext
	);
	return { iv, ciphertext: new Uint8Array(ciphertext) };
}

export async function open(key: Bytes, sealed: Sealed, aad: Bytes): Promise<Bytes> {
	try {
		const plaintext = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: sealed.iv, additionalData: aad },
			await importKey(key, 'decrypt'),
			sealed.ciphertext
		);
		return new Uint8Array(plaintext);
	} catch {
		throw new DecryptError();
	}
}
