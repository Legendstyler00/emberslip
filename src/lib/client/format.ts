const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
// The interface is English-only for now, so relative phrases must be too.
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

const units: [Intl.RelativeTimeFormatUnit, number][] = [
	['day', 86_400_000],
	['hour', 3_600_000],
	['minute', 60_000]
];

export function formatDate(ms: number): string {
	return dateTime.format(ms);
}

export function formatRelative(ms: number, now = Date.now()): string {
	const diff = ms - now;
	for (const [unit, size] of units) {
		const value = Math.round(diff / size);
		if (Math.abs(value) >= 1) return relative.format(value, unit);
	}
	return diff >= 0 ? 'in less than a minute' : 'just now';
}

export function plural(n: number, one: string, many: string): string {
	return `${n} ${n === 1 ? one : many}`;
}
