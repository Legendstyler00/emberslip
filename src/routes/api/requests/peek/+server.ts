import { api, bytesField, limit, readJson, reply } from '#lib/server/http.ts';
import { hashToken } from '#lib/server/notes.ts';
import { respondStatusCode, serializeRespondView } from '#lib/server/request-api.ts';
import { limits, requestStore } from '#lib/server/services.ts';

export const POST = api(async (event) => {
	limit(limits.read, event);
	const body = await readJson(event.request, 1024);
	const respondToken = bytesField(body, 'respondToken', { length: 32 });

	const view = requestStore().respondView(hashToken(respondToken));
	return reply(serializeRespondView(view), respondStatusCode(view.status));
});
