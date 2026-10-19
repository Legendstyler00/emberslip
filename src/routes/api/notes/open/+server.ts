import { api, bytesField, limit, optionalBytesField, readJson, reply } from '#lib/server/http.ts';
import { serializeOpen, statusCode } from '#lib/server/note-api.ts';
import { hashToken } from '#lib/server/notes.ts';
import { limits, noteStore } from '#lib/server/services.ts';

export const POST = api(async (event) => {
	limit(limits.read, event);
	const body = await readJson(event.request, 1024);
	const linkToken = bytesField(body, 'linkToken', { length: 32 });
	const pwToken = optionalBytesField(body, 'pwToken', 32);

	const result = noteStore().open(hashToken(linkToken), pwToken);
	return reply(serializeOpen(result), statusCode(result));
});
