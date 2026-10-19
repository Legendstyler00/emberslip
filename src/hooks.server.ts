import { building } from '$app/env';
import type { ServerInit } from '@sveltejs/kit/hooks';
import { startSweeper } from '#lib/server/sweep.ts';

export const init: ServerInit = () => {
	if (!building) startSweeper();
};
