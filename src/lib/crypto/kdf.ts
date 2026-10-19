import { utf8, type Bytes } from './bytes';

export const PROTOCOL = 'emberslip/v1';

export function label(name: string): string {
	return `${PROTOCOL}/${name}`;
}

export async function sha256(data: Bytes): Promise<Bytes> {
	return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
}

export async function hkdf(
	ikm: Bytes,
	info: string | Bytes,
	salt: Bytes = new Uint8Array(0),
	length = 32
): Promise<Bytes> {
	const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'HKDF', hash: 'SHA-256', salt, info: typeof info === 'string' ? utf8(info) : info },
		key,
		length * 8
	);
	return new Uint8Array(bits);
}

export interface PasswordKdf {
	alg: 'PBKDF2-SHA256';
	iterations: number;
	/** base64url */
	salt: string;
}

export const PBKDF2_ITERATIONS = 600_000;

export async function pbkdf2(password: string, salt: Bytes, iterations: number): Promise<Bytes> {
	// The same password typed on different systems can arrive in different Unicode forms.
	const key = await crypto.subtle.importKey(
		'raw',
		utf8(password.normalize('NFC')),
		'PBKDF2',
		false,
		['deriveBits']
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
		key,
		256
	);
	return new Uint8Array(bits);
}
