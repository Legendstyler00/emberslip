import { createHmac, randomBytes } from 'node:crypto';
import { isIPv6 } from 'node:net';

interface Bucket {
	tokens: number;
	updated: number;
}

// Client addresses are only kept in memory, and only as keyed hashes that change on every restart.
const addressKey = randomBytes(32);

/** About 15 MB of buckets per limiter. */
const MAX_BUCKETS = 100_000;

export function clientKey(address: string): string {
	return createHmac('sha256', addressKey).update(clientId(address)).digest('base64url');
}

const MAPPED_IPV4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i;

// A single IPv6 subscriber usually gets a whole /64, so counting each address separately would
// let one client rotate through endless fresh buckets.
function clientId(address: string): string {
	if (!isIPv6(address)) return address;
	const mapped = MAPPED_IPV4.exec(address);
	if (mapped) return mapped[1];
	return `${ipv6Groups(address).slice(0, 4).join(':')}::/64`;
}

/** The eight groups of an IPv6 address, without leading zeros. */
function ipv6Groups(address: string): string[] {
	// Only the first 64 bits are used, so a trailing embedded IPv4 address can stand in as zeros.
	const plain = address.replace(/%.*$/, '').replace(/\d+\.\d+\.\d+\.\d+$/, '0:0');
	const [head, tail] = plain.split('::');
	const left = head ? head.split(':') : [];
	const right = tail ? tail.split(':') : [];
	const gap = tail === undefined ? [] : Array<string>(8 - left.length - right.length).fill('0');
	return [...left, ...gap, ...right].map((group) => parseInt(group, 16).toString(16));
}

/** Token bucket per client. A capacity of 0 disables the limit. */
export class RateLimiter {
	// Kept in least recently used order, so the stalest bucket is the first one in the map.
	#buckets = new Map<string, Bucket>();
	readonly capacity: number;
	readonly #refillPerMs: number;
	readonly #maxBuckets: number;

	constructor(capacity: number, windowMs: number, maxBuckets = MAX_BUCKETS) {
		this.capacity = capacity;
		this.#refillPerMs = capacity / windowMs;
		this.#maxBuckets = maxBuckets;
	}

	static perMinute(limit: number) {
		return new RateLimiter(limit, 60_000);
	}

	static perHour(limit: number) {
		return new RateLimiter(limit, 3_600_000);
	}

	take(key: string, now = Date.now()): boolean {
		if (this.capacity === 0) return true;
		const bucket = this.#refill(key, now);
		if (bucket.tokens < 1) return false;
		bucket.tokens -= 1;
		return true;
	}

	/** Drops buckets that have refilled completely, so the map doesn't grow forever. */
	prune(now = Date.now()) {
		for (const [key, bucket] of this.#buckets) {
			if (bucket.tokens + (now - bucket.updated) * this.#refillPerMs >= this.capacity) {
				this.#buckets.delete(key);
			}
		}
	}

	#refill(key: string, now: number): Bucket {
		let bucket = this.#buckets.get(key);
		if (!bucket) {
			bucket = { tokens: this.capacity, updated: now };
		} else {
			const elapsed = Math.max(0, now - bucket.updated);
			bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsed * this.#refillPerMs);
			bucket.updated = now;
			this.#buckets.delete(key);
		}
		this.#buckets.set(key, bucket);
		// Forgetting the stalest client only resets its limit. Refusing new clients instead would let
		// anyone with enough addresses lock everybody else out.
		if (this.#buckets.size > this.#maxBuckets) {
			this.#buckets.delete(this.#buckets.keys().next().value!);
		}
		return bucket;
	}
}
