import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CRT_KEY, THEME_KEY } from './display';

describe('display keys', () => {
	it('are the ones the blocking init script reads', () => {
		const script = readFileSync(new URL('../../../static/theme-init.js', import.meta.url), 'utf8');
		expect(script).toContain(`localStorage.getItem('${THEME_KEY}')`);
		expect(script).toContain(`localStorage.getItem('${CRT_KEY}')`);
	});
});
