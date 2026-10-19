import { open, seal } from './aead';
import { fromBase64Url, randomBytes, toBase64Url, utf8, type Bytes } from './bytes';
import { decodeEnvelope, encodeEnvelope } from './envelope';
import { hkdf, label, pbkdf2, PBKDF2_ITERATIONS, type PasswordKdf } from './kdf';

export const NOTE_KEY_BYTES = 32;

/** What the browser sends to the server when creating a note. All binary values are base64url. */
export interface NotePayload {
	linkToken: string;
	iv: string;
	ciphertext: string;
	kdf: PasswordKdf | null;
	pwToken: string | null;
}

export interface NoteSecrets {
	encKey: Bytes;
	pwToken: string | null;
}

export function generateNoteKey(): Bytes {
	return randomBytes(NOTE_KEY_BYTES);
}

/** Parses the key from a link fragment, with or without the leading `#`. */
export function parseNoteKey(fragment: string): Bytes | null {
	try {
		const key = fromBase64Url(fragment.replace(/^#/, ''));
		return key.length === NOTE_KEY_BYTES ? key : null;
	} catch {
		return null;
	}
}

/** Proves to the server that the caller holds the full link. The server stores only its hash. */
export async function deriveLinkToken(key: Bytes): Promise<string> {
	return toBase64Url(await hkdf(key, label('link')));
}

/**
 * The status link carries its own random key, independent of K, so it can show a note's state
 * and burn it but never decrypt it. The server stores only the hash of the derived token.
 */
export function generateManageKey(): Bytes {
	return randomBytes(NOTE_KEY_BYTES);
}

export async function deriveManageToken(manageKey: Bytes): Promise<string> {
	return toBase64Url(await hkdf(manageKey, label('manage')));
}

export function isAcceptableKdf(kdf: PasswordKdf): boolean {
	return (
		kdf.alg === 'PBKDF2-SHA256' &&
		Number.isInteger(kdf.iterations) &&
		kdf.iterations >= 100_000 &&
		kdf.iterations <= 10_000_000 &&
		/^[A-Za-z0-9_-]{22}$/.test(kdf.salt)
	);
}

export async function deriveNoteSecrets(
	key: Bytes,
	kdf: PasswordKdf | null,
	password: string | null
): Promise<NoteSecrets> {
	if (!kdf) return { encKey: await hkdf(key, label('enc')), pwToken: null };
	if (password === null) throw new Error('This note needs a password');
	if (!isAcceptableKdf(kdf)) throw new Error('Unsupported password settings');

	const passwordKey = await pbkdf2(password, fromBase64Url(kdf.salt), kdf.iterations);
	const [encKey, pwToken] = await Promise.all([
		hkdf(key, label('enc'), passwordKey),
		hkdf(key, label('pw'), passwordKey)
	]);
	return { encKey, pwToken: toBase64Url(pwToken) };
}

// Binds the ciphertext to its password settings, so a server that swaps them is detected.
function noteAad(kdf: PasswordKdf | null): Bytes {
	const pw = kdf ? `${kdf.alg},${kdf.iterations},${kdf.salt}` : 'none';
	return utf8(`${label('note')};pw=${pw}`);
}

export async function encryptNote(
	key: Bytes,
	text: string,
	password: string | null
): Promise<NotePayload> {
	const kdf: PasswordKdf | null = password
		? { alg: 'PBKDF2-SHA256', iterations: PBKDF2_ITERATIONS, salt: toBase64Url(randomBytes(16)) }
		: null;
	const [secrets, linkToken] = await Promise.all([
		deriveNoteSecrets(key, kdf, password || null),
		deriveLinkToken(key)
	]);
	const sealed = await seal(secrets.encKey, encodeEnvelope(text), noteAad(kdf));
	return {
		linkToken,
		iv: toBase64Url(sealed.iv),
		ciphertext: toBase64Url(sealed.ciphertext),
		kdf,
		pwToken: secrets.pwToken
	};
}

export async function decryptNote(
	secrets: NoteSecrets,
	kdf: PasswordKdf | null,
	iv: string,
	ciphertext: string
): Promise<string> {
	const plaintext = await open(
		secrets.encKey,
		{ iv: fromBase64Url(iv), ciphertext: fromBase64Url(ciphertext) },
		noteAad(kdf)
	);
	return decodeEnvelope(plaintext).text;
}
