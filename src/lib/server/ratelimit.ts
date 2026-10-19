import { createHmac, randomBytes } from 'node:crypto';

interface Bucket {
	tokens: number;
	updated: number;
}

// Client addresses are only kept in memory, and only as keyed hashes that change on every restart.
const addressKey = randomBytes(32);

export function clientKey(address: string): string {
	return createHmac('sha256', addressKey).update(address).digest('base64url');
}

/** Token bucket per client. A capacity of 0 disables the limit. */
export class RateLimiter {
	#buckets = new Map<string, Bucket>();
	readonly capacity: number;
	readonly #refillPerMs: number;

	constructor(capacity: number, windowMs: number) {
		this.capacity = capacity;
		this.#refillPerMs = capacity / windowMs;
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
			this.#buckets.set(key, bucket);
		} else {
			const elapsed = Math.max(0, now - bucket.updated);
			bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsed * this.#refillPerMs);
			bucket.updated = now;
		}
		return bucket;
	}
}
