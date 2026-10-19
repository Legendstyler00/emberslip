/**
 * Runs `start` now and again whenever another link is pasted into the same tab (which only
 * changes the fragment), and `hide` when the page is left, so decrypted text doesn't end up
 * in the back/forward cache. Returns a cleanup function.
 */
export function watchFragment(start: () => void, hide: () => void): () => void {
	start();
	const restart = () => {
		if (location.hash) start();
	};
	window.addEventListener('hashchange', restart);
	window.addEventListener('pagehide', hide);
	return () => {
		window.removeEventListener('hashchange', restart);
		window.removeEventListener('pagehide', hide);
	};
}

export function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}
