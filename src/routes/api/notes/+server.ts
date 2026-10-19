import { MAX_PADDED_SIZE } from '#lib/crypto/envelope.ts';
import { config } from '#lib/server/config.ts';
import {
	api,
	ApiError,
	bytesField,
	intField,
	kdfField,
	limit,
	optionalBytesField,
	readJson,
	reply
} from '#lib/server/http.ts';
import { isPaddedCiphertext, MAX_REQUEST_BYTES } from '#lib/server/note-api.ts';
import { hashToken } from '#lib/server/notes.ts';
import { limits, noteStore } from '#lib/server/services.ts';

export const POST = api(async (event) => {
	limit(limits.create, event);
	const body = await readJson(event.request, MAX_REQUEST_BYTES);

	const linkToken = bytesField(body, 'linkToken', { length: 32 });
	const iv = bytesField(body, 'iv', { length: 12 });
	const ciphertext = bytesField(body, 'ciphertext', { max: MAX_PADDED_SIZE + 16 });
	if (!isPaddedCiphertext(ciphertext.length)) throw new ApiError(400, 'Invalid ciphertext');

	const kdf = kdfField(body);
	const pwToken = optionalBytesField(body, 'pwToken', 32);
	if (!kdf !== !pwToken) throw new ApiError(400, 'kdf and pwToken must be sent together');

	const manageToken = optionalBytesField(body, 'manageToken', 32);

	const views = intField(body, 'views', 1, config.maxViews);
	const ttl = intField(body, 'ttl', config.minTtlSeconds, config.maxTtlSeconds);
	const expiresAt = Date.now() + ttl * 1000;

	const result = noteStore().create({
		id: hashToken(linkToken),
		iv,
		ciphertext,
		kdf,
		pwHash: pwToken && hashToken(pwToken),
		views,
		expiresAt,
		manageHash: manageToken && hashToken(manageToken)
	});
	if (result === 'full') throw new ApiError(503, 'Storage is full right now, try again later');
	if (result === 'exists') throw new ApiError(409, 'A note with this key already exists');

	return reply({ expiresAt, views }, 201);
});
