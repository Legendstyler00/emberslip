import { api, bytesField, limit, readJson, reply } from '#lib/server/http.ts';
import { statusCode } from '#lib/server/note-api.ts';
import { hashToken } from '#lib/server/notes.ts';
import { limits, noteStore } from '#lib/server/services.ts';

export const POST = api(async (event) => {
	limit(limits.read, event);
	const body = await readJson(event.request, 1024);
	const manageToken = bytesField(body, 'manageToken', { length: 32 });

	const result = noteStore().burnNow(hashToken(manageToken));
	return reply(result, statusCode(result));
});
