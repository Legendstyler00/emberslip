import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	imprint: process.env.IMPRINT?.replace(/\\n/g, '\n').trim() || null
});
