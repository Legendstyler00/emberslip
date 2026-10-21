<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Gouda from '#lib/components/Gouda.svelte';
	import Terminal from '#lib/components/Terminal.svelte';

	const notFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{notFound ? 'Not found' : 'Error'} · Emberslip</title>
</svelte:head>

<!-- The 404 page of ratte.lol, with Emberslip's wording. -->
<section class="rt-section">
	<div class="rt-split rt-split--top">
		<div class="page-stack">
			<div class="rt-section-head">
				<h1 class="h1">{notFound ? 'This page got gnawed off.' : 'Something broke down here.'}</h1>
				<p class="body-lg lead">
					{#if notFound}
						There's nothing at this address. Secret links only work in full, so check that you
						copied all of it.
					{:else}
						{page.error?.message ?? 'Please try again in a moment.'}
					{/if}
				</p>
			</div>
			<div class="page-actions">
				<a
					class="rt-btn rt-btn--primary rt-btn--md rt-glitch"
					data-text="Back to the start"
					href={resolve('/')}><span class="rt-btn-label">Back to the start</span></a
				>
			</div>
		</div>

		<div class="aside">
			<Terminal
				lines={[
					{ text: 'cat ./this-page' },
					{
						kind: 'err',
						text: notFound ? 'File not found (404)' : `Something went wrong (${page.status})`
					}
				]}
				cursor
			/>
			<Gouda mood="panik">I swear it was here a second ago!</Gouda>
		</div>
	</div>
</section>

<style>
	.lead {
		color: var(--ink-muted);
		max-width: 52ch;
	}

	.aside {
		display: grid;
		gap: var(--space-6);
		align-content: start;
	}
</style>
