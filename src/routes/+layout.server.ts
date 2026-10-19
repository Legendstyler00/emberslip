import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => ({
	// The AGPL asks anyone running a modified copy to offer its source, so this is configurable.
	sourceUrl: process.env.SOURCE_URL || 'https://github.com/Legendstyler00/emberslip'
});
