<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Imprint · Emberslip</title>
</svelte:head>

<article class="card prose">
	<h1>Imprint</h1>
	{#if data.imprint}
		<p class="imprint">{data.imprint}</p>
	{:else}
		<p class="hint">The operator of this instance hasn't added their contact details yet.</p>
	{/if}
</article>

<style>
	.imprint {
		white-space: pre-line;
	}
</style>
