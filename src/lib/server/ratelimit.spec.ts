import { describe, expect, it } from 'vitest';
import { clientKey, RateLimiter } from './ratelimit';

describe('RateLimiter', () => {
	it('allows bursts up to capacity, then refills over time', () => {
		const limiter = RateLimiter.perMinute(3);
		expect([1, 2, 3, 4].map(() => limiter.take('a', 0))).toEqual([true, true, true, false]);
		expect(limiter.take('b', 0)).toBe(true);
		expect(limiter.take('a', 19_000)).toBe(false);
		expect(limiter.take('a', 20_000)).toBe(true);
	});

	it('is disabled with a capacity of 0', () => {
		const limiter = RateLimiter.perMinute(0);
		for (let i = 0; i < 100; i++) expect(limiter.take('a', 0)).toBe(true);
	});

	it('prunes buckets that have fully refilled', () => {
		const limiter = RateLimiter.perMinute(2);
		limiter.take('a', 0);
		limiter.prune(60_000);
		expect([1, 2, 3].map(() => limiter.take('a', 60_000))).toEqual([true, true, false]);
	});

	it('does not keep raw addresses', () => {
		expect(clientKey('203.0.113.7')).not.toContain('203');
		expect(clientKey('203.0.113.7')).toBe(clientKey('203.0.113.7'));
	});
});
