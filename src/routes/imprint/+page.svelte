<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Imprint · Emberslip</title>
</svelte:head>

<article class="rt-section info">
	<header class="rt-section-head page-measure">
		<h1 class="h1">Imprint</h1>
	</header>
	<div class="rt-prose">
		{#if data.imprint}
			<p class="imprint">{data.imprint}</p>
		{:else}
			<p class="hint">The operator of this instance hasn't added their contact details yet.</p>
		{/if}
	</div>
</article>

<style>
	.imprint {
		white-space: pre-line;
	}
</style>
