<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		loading = false,
		children
	}: { title?: string; loading?: boolean; children?: Snippet } = $props();
</script>

<section class="card status" aria-busy={loading}>
	{#if loading}
		<span class="spinner" aria-hidden="true"></span>
	{/if}
	{#if title}
		<h1>{title}</h1>
	{/if}
	{@render children?.()}
</section>

<style>
	.status {
		display: grid;
		justify-items: center;
		gap: 14px;
		text-align: center;
		padding-block: 36px;
	}

	h1 {
		font-size: 28px;
	}

	.status :global(p) {
		max-width: 48ch;
	}
</style>
