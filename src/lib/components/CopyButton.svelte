<script lang="ts">
	let {
		text,
		label = 'Copy',
		clearAfter = 0,
		primary = false
	}: {
		text: string;
		label?: string;
		/** Seconds after which the clipboard is overwritten again. 0 keeps it. */
		clearAfter?: number;
		/** The main action of its view, drawn as a filled button. */
		primary?: boolean;
	} = $props();

	let copied = $state(false);
	let failed = $state(false);
	let resetTimer: ReturnType<typeof setTimeout> | undefined;
	let clearTimer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			failed = false;
		} catch {
			failed = true;
			return;
		}
		clearTimeout(resetTimer);
		resetTimer = setTimeout(() => (copied = false), 2000);

		if (clearAfter > 0) {
			clearTimeout(clearTimer);
			clearTimer = setTimeout(() => {
				// Browsers only allow this while the page has focus; if it fails there's nothing to do.
				navigator.clipboard.writeText('').catch(() => {});
			}, clearAfter * 1000);
		}
	}
</script>

<button
	type="button"
	class="rt-btn rt-btn--md copy"
	class:rt-btn--primary={primary}
	class:rt-btn--secondary={!primary}
	onclick={copy}
>
	{#if copied}
		<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
			<path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" stroke-width="1.8" />
		</svg>
		Copied
	{:else}
		<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
			<rect
				x="5"
				y="5"
				width="8.5"
				height="8.5"
				rx="2"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
			/>
			<path
				d="M3 10.5V4a1.5 1.5 0 0 1 1.5-1.5H10"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
			/>
		</svg>
		{label}
	{/if}
</button>
<span class="visually-hidden" aria-live="polite">
	{copied
		? 'Copied to clipboard'
		: failed
			? 'Copying failed, select the text and copy it manually'
			: ''}
</span>

<style>
	.copy {
		flex: none;
	}
</style>
