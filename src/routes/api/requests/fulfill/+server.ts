import { MAX_PADDED_SIZE } from '#lib/crypto/envelope.ts';
import { api, ApiError, bytesField, limit, readJson, reply } from '#lib/server/http.ts';
import { isPaddedCiphertext, MAX_REQUEST_BYTES } from '#lib/server/note-api.ts';
import { hashToken } from '#lib/server/notes.ts';
import { respondStatusCode } from '#lib/server/request-api.ts';
import { limits, requestStore } from '#lib/server/services.ts';

export const POST = api(async (event) => {
	limit(limits.create, event);
	const body = await readJson(event.request, MAX_REQUEST_BYTES + 2048);

	const respondToken = bytesField(body, 'respondToken', { length: 32 });
	const kemCiphertext = bytesField(body, 'kemCiphertext', { length: 1120 });
	const iv = bytesField(body, 'iv', { length: 12 });
	const ciphertext = bytesField(body, 'ciphertext', { max: MAX_PADDED_SIZE + 16 });
	if (!isPaddedCiphertext(ciphertext.length)) throw new ApiError(400, 'Invalid ciphertext');

	const status = requestStore().fulfill(hashToken(respondToken), { kemCiphertext, iv, ciphertext });
	if (status === 'open') return reply({ status: 'sent' }, 201);
	return reply({ status }, respondStatusCode(status));
});
