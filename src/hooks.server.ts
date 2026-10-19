import { building } from '$app/env';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { startSweeper } from '#lib/server/sweep.ts';

export const init: ServerInit = () => {
	if (!building) startSweeper();
};

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	// Pages that show secrets must never be cached, by the browser or anything in between.
	if (!response.headers.has('cache-control')) response.headers.set('cache-control', 'no-store');
	return response;
};
