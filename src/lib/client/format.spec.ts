import { describe, expect, it } from 'vitest';
import { formatRelative, plural } from './format';

describe('formatRelative', () => {
	const now = 1_000_000_000_000;

	it('picks the largest unit that rounds to at least one', () => {
		expect(formatRelative(now + 86_400_000 - 5_000, now)).toBe('in 1 day');
		expect(formatRelative(now + 3_600_000, now)).toBe('in 1 hour');
		expect(formatRelative(now + 5 * 60_000, now)).toBe('in 5 minutes');
		expect(formatRelative(now + 10_000, now)).toBe('in less than a minute');
	});
});

describe('plural', () => {
	it('uses the singular only for one', () => {
		expect(plural(1, 'view', 'views')).toBe('1 view');
		expect(plural(3, 'view', 'views')).toBe('3 views');
	});
});
