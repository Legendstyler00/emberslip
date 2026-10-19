// X-Wing: ML-KEM-768 combined with X25519, so an attacker has to break both.
// Kept behind this module so it can move to native WebCrypto once browsers ship ML-KEM.
import { ml_kem768_x25519 as xwing } from '@noble/post-quantum/hybrid.js';
import type { Bytes } from './bytes';

export const KEM_SEED_BYTES = xwing.lengths.seed!;
export const KEM_PUBLIC_KEY_BYTES = xwing.lengths.publicKey!;
export const KEM_CIPHERTEXT_BYTES = xwing.lengths.cipherText!;

export function publicKeyFromSeed(seed: Bytes): Bytes {
	return new Uint8Array(xwing.keygen(seed).publicKey);
}

export function encapsulate(publicKey: Bytes): { cipherText: Bytes; sharedSecret: Bytes } {
	const { cipherText, sharedSecret } = xwing.encapsulate(publicKey);
	return { cipherText: new Uint8Array(cipherText), sharedSecret: new Uint8Array(sharedSecret) };
}

export function decapsulate(cipherText: Bytes, seed: Bytes): Bytes {
	const { secretKey } = xwing.keygen(seed);
	return new Uint8Array(xwing.decapsulate(cipherText, secretKey));
}
