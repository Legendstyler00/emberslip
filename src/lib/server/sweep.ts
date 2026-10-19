import { config } from './config';
import { checkpoint } from './db';
import { database, limits, noteStore } from './services';

export function sweep(now = Date.now()) {
	const store = noteStore();
	store.burnExpired(now);
	store.purgeTombstones(now);
	checkpoint(database());
	for (const limiter of Object.values(limits)) limiter.prune(now);
}

let timer: NodeJS.Timeout | undefined;

export function startSweeper() {
	if (timer) return;
	sweep();
	timer = setInterval(() => {
		try {
			sweep();
		} catch (err) {
			console.error('sweep failed', err);
		}
	}, config.sweepIntervalSeconds * 1000);
	timer.unref();
}
