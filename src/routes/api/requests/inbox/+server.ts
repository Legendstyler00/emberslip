import { api, bytesField, limit, readJson, reply } from '#lib/server/http.ts';
import { hashToken } from '#lib/server/notes.ts';
import { inboxStatusCode } from '#lib/server/request-api.ts';
import { limits, requestStore } from '#lib/server/services.ts';

export const POST = api(async (event) => {
	limit(limits.read, event);
	const body = await readJson(event.request, 1024);
	const inboxToken = bytesField(body, 'inboxToken', { length: 32 });

	const view = requestStore().inboxView(hashToken(inboxToken));
	return reply(view, inboxStatusCode(view));
});
