import { config } from '#lib/server/config.ts';
import { api, ApiError, bytesField, intField, limit, readJson, reply } from '#lib/server/http.ts';
import { hashToken } from '#lib/server/notes.ts';
import { isSealedRequest } from '#lib/server/request-api.ts';
import { limits, requestStore } from '#lib/server/services.ts';

export const POST = api(async (event) => {
	limit(limits.create, event);
	const body = await readJson(event.request, 16 * 1024);

	const respondToken = bytesField(body, 'respondToken', { length: 32 });
	const inboxToken = bytesField(body, 'inboxToken', { length: 32 });
	const sealedIv = bytesField(body, 'sealedIv', { length: 12 });
	const sealed = bytesField(body, 'sealed', { max: 8192 });
	if (!isSealedRequest(sealed.length)) throw new ApiError(400, 'Invalid sealed');
	const ttl = intField(body, 'ttl', config.minTtlSeconds, config.maxTtlSeconds);
	const expiresAt = Date.now() + ttl * 1000;

	const result = requestStore().create({
		id: hashToken(respondToken),
		inboxId: hashToken(inboxToken),
		sealedIv,
		sealed,
		expiresAt
	});
	if (result === 'full') throw new ApiError(503, 'Storage is full right now, try again later');
	if (result === 'exists') throw new ApiError(409, 'This request already exists');

	return reply({ expiresAt }, 201);
});
