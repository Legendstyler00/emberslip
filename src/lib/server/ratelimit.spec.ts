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

	it('forgets the least recently used client once it holds too many', () => {
		const limiter = new RateLimiter(1, 60_000, 2);
		expect(limiter.take('a', 0)).toBe(true);
		expect(limiter.take('b', 0)).toBe(true);
		expect(limiter.take('a', 0)).toBe(false);
		expect(limiter.take('c', 0)).toBe(true);
		expect(limiter.take('a', 0)).toBe(false);
		expect(limiter.take('b', 0)).toBe(true);
	});
});

describe('clientKey', () => {
	it('does not keep raw addresses', () => {
		expect(clientKey('203.0.113.7')).not.toContain('203');
		expect(clientKey('203.0.113.7')).toBe(clientKey('203.0.113.7'));
		expect(clientKey('203.0.113.7')).not.toBe(clientKey('203.0.113.8'));
	});

	it('treats a whole IPv6 /64 as one client', () => {
		const key = clientKey('2001:db8:1:2::1');
		expect(clientKey('2001:db8:1:2:ffff:ffff:ffff:ffff')).toBe(key);
		expect(clientKey('2001:0DB8:0001:0002:0:0:0:abcd')).toBe(key);
		expect(clientKey('2001:db8:1:3::1')).not.toBe(key);
		expect(clientKey('2001:db8::1')).toBe(clientKey('2001:db8:0:0:1::'));
		expect(clientKey('fe80::1%eth0')).toBe(clientKey('fe80::2'));
		expect(clientKey('64:ff9b::192.0.2.1')).toBe(clientKey('64:ff9b::'));
	});

	it('treats IPv4-mapped IPv6 addresses as the IPv4 address', () => {
		expect(clientKey('::ffff:203.0.113.7')).toBe(clientKey('203.0.113.7'));
		expect(clientKey('::FFFF:203.0.113.7')).not.toBe(clientKey('::ffff:203.0.113.8'));
	});
});
