<script lang="ts">
	import type { Snippet } from 'svelte';
	import Terminal from './Terminal.svelte';

	let {
		title,
		loading = false,
		children
	}: { title?: string; loading?: boolean; children?: Snippet } = $props();
</script>

<section class="rt-panel status" aria-busy={loading}>
	{#if loading}
		<Terminal cursor />
	{/if}
	{#if title}
		<h1 class="h2">{title}</h1>
	{/if}
	{@render children?.()}
</section>

<style>
	.status {
		gap: var(--space-4);
		align-content: start;
	}

	.status :global(p) {
		max-width: 52ch;
	}

	.status :global(.rt-btn) {
		justify-self: start;
	}
</style>
