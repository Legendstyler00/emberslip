function int(name: string, fallback: number): number {
	const raw = process.env[name];
	if (raw === undefined || raw === '') return fallback;
	const value = Number(raw);
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new Error(`${name} must be a non-negative integer, got ${JSON.stringify(raw)}`);
	}
	return value;
}

const MINUTE = 60;
const DAY = 24 * 60 * MINUTE;

export const config = {
	dbPath: process.env.DB_PATH || 'data/emberslip.db',
	/** Total database size at which new notes are refused. */
	maxDbBytes: int('MAX_DB_BYTES', 1024 ** 3),
	maxViews: int('MAX_VIEWS', 10),
	minTtlSeconds: int('MIN_TTL_SECONDS', 5 * MINUTE),
	maxTtlSeconds: int('MAX_TTL_SECONDS', 7 * DAY),
	maxPasswordAttempts: int('MAX_PASSWORD_ATTEMPTS', 5),
	tombstoneSeconds: int('TOMBSTONE_SECONDS', 30 * DAY),
	sweepIntervalSeconds: int('SWEEP_INTERVAL_SECONDS', 60),
	rateLimit: {
		createPerHour: int('RATE_LIMIT_CREATE_PER_HOUR', 30),
		readPerMinute: int('RATE_LIMIT_READ_PER_MINUTE', 30)
	}
};

export type Config = typeof config;
