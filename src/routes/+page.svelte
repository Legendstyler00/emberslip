<script lang="ts">
	import gouda from '#lib/assets/gouda.svg';
	import Gouda from '#lib/components/Gouda.svelte';
	import NoteForm, { type CreatedNote } from '#lib/components/NoteForm.svelte';
	import ShareResult from '#lib/components/ShareResult.svelte';
	import Terminal from '#lib/components/Terminal.svelte';

	let created = $state<CreatedNote | null>(null);
</script>

<svelte:head>
	<title>Emberslip: share secrets that burn after reading</title>
</svelte:head>

{#if created}
	<section class="rt-section">
		<div class="rt-split rt-split--top">
			<ShareResult note={created} onreset={() => (created = null)} />
			<Gouda mood="zufrieden" side="right"
				>Sealed and ready. Not even my nose gets through that.</Gouda
			>
		</div>
	</section>
{:else}
	<section class="rt-section">
		<div class="rt-split">
			<div class="rt-section-head">
				<h1 class="h1">Share a secret that <em>burns</em> after reading.</h1>
				<p class="body-lg lead">
					Your note is encrypted on this device and turned into a link. Once it has been read, or
					when its time is up, it's gone for good.
				</p>
			</div>
			<div class="hero-screen">
				<Terminal
					typing
					cursor
					lines={[
						{ text: './emberslip --burn-after-reading' },
						{ kind: 'ok', text: 'encrypted in this browser' },
						{ kind: 'ok', text: 'the key stays behind the #' },
						{ kind: 'comment', text: 'the server only ever sees ciphertext' }
					]}
				/>
				<img class="hero-gouda" src={gouda} alt="" width="99" height="120" />
			</div>
		</div>
	</section>

	<noscript>
		<p class="error">Emberslip encrypts notes in your browser, so it needs JavaScript to work.</p>
	</noscript>

	<section class="rt-section compose">
		<div class="rt-split rt-split--top">
			<NoteForm oncreated={(note) => (created = note)} />

			<div class="aside">
				<ul class="points">
					<li class="rt-panel point">
						<span class="rt-card-path meta" aria-hidden="true">~/crypto/<b>e2e</b></span>
						<strong class="h3">End-to-end encrypted</strong>
						<span>The key stays in the link and never reaches our server.</span>
					</li>
					<li class="rt-panel point">
						<span class="rt-card-path meta" aria-hidden="true">~/notes/<b>burn</b></span>
						<strong class="h3">Burns after reading</strong>
						<span>You choose how many views and how long it lives.</span>
					</li>
					<li class="rt-panel point">
						<span class="rt-card-path meta" aria-hidden="true">~/crypto/<b>pq</b></span>
						<strong class="h3">Quantum-resistant</strong>
						<span>AES-256 with 256-bit keys, no public-key crypto to break.</span>
					</li>
				</ul>
				<Gouda mood="frech">I chew through cables for fun. Your ciphertext I leave alone.</Gouda>
			</div>
		</div>
	</section>
{/if}

<style>
	h1 em {
		font-style: normal;
		color: var(--alarm);
	}

	.lead {
		color: var(--ink-muted);
		max-width: 52ch;
	}

	/* On phones the form matters more than the decoration. */
	@media (width<=959.98px) {
		.hero-screen {
			display: none;
		}
	}

	.compose {
		margin-top: 0;
	}

	noscript .error {
		margin-bottom: var(--space-6);
	}

	.aside {
		display: grid;
		gap: var(--space-8);
		align-content: start;
	}

	.points {
		display: grid;
		gap: var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.point {
		gap: var(--space-1);
		padding: var(--space-4) var(--space-6);
	}

	.point span:last-child {
		color: var(--ink-muted);
		font: var(--type-body-sm);
	}
</style>
