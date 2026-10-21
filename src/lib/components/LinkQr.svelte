<script lang="ts">
	import QrCode from './QrCode.svelte';

	let { link, label }: { link: string; label: string } = $props();

	// Hidden by default: a QR code on screen is much easier to capture from a distance than text.
	let open = $state(false);
</script>

<div class="link-qr">
	<button
		type="button"
		class="rt-btn rt-btn--secondary rt-btn--sm toggle"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
			<path
				d="M2.5 2.5h4v4h-4zM9.5 2.5h4v4h-4zM2.5 9.5h4v4h-4z"
				fill="none"
				stroke="currentColor"
				stroke-width="1.4"
			/>
			<path d="M9.5 9.5h2v2h-2zM11.5 11.5h2v2h-2z" fill="currentColor" />
		</svg>
		{open ? 'Hide QR code' : 'Show QR code'}
	</button>

	{#if open}
		<div class="panel">
			<QrCode text={link} {label} />
			<p class="hint">
				Scan it with your phone's camera app. Avoid third-party scanner apps, since some of them
				send what they scan to their own servers.
			</p>
		</div>
	{/if}
</div>

<style>
	.link-qr {
		display: grid;
		gap: var(--space-4);
	}

	.toggle {
		justify-self: start;
	}

	.panel {
		display: grid;
		justify-items: center;
		gap: var(--space-3);
		padding: var(--space-4);
		background: var(--surface-sunken);
		border: 1px dashed var(--line-strong);
		text-align: center;
	}

	.hint {
		max-width: 40ch;
	}
</style>
