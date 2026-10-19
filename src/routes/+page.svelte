<script lang="ts">
	import NoteForm, { type CreatedNote } from '#lib/components/NoteForm.svelte';
	import ShareResult from '#lib/components/ShareResult.svelte';

	let created = $state<CreatedNote | null>(null);
</script>

<svelte:head>
	<title>Emberslip: share secrets that burn after reading</title>
</svelte:head>

{#if created}
	<ShareResult note={created} onreset={() => (created = null)} />
{:else}
	<section class="intro">
		<h1>Share a secret that <em>burns</em> after reading.</h1>
		<p>
			Your note is encrypted on this device and turned into a link. Once it has been read, or when
			its time is up, it's gone for good.
		</p>
	</section>

	<noscript>
		<p class="error">Emberslip encrypts notes in your browser, so it needs JavaScript to work.</p>
	</noscript>

	<NoteForm oncreated={(note) => (created = note)} />

	<ul class="points">
		<li>
			<strong>End-to-end encrypted</strong>
			<span>The key stays in the link and never reaches our server.</span>
		</li>
		<li>
			<strong>Burns after reading</strong>
			<span>You choose how many views and how long it lives.</span>
		</li>
		<li>
			<strong>Quantum-resistant</strong>
			<span>AES-256 with 256-bit keys, no public-key crypto to break.</span>
		</li>
	</ul>
{/if}

<style>
	.intro {
		display: grid;
		gap: 14px;
		margin: 12px 0 28px;
	}

	h1 {
		font-size: clamp(32px, 6vw, 46px);
		max-width: 16ch;
	}

	em {
		font-style: italic;
		background: linear-gradient(135deg, var(--ember), var(--ember-2));
		background-clip: text;
		color: transparent;
	}

	.intro p {
		color: var(--muted);
		font-size: 17px;
		max-width: 56ch;
	}

	noscript p {
		margin-bottom: 16px;
	}

	.points {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
		gap: 18px;
		margin: 32px 0 0;
		padding: 0;
		list-style: none;
	}

	.points li {
		display: grid;
		gap: 4px;
		font-size: 14px;
	}

	.points span {
		color: var(--muted);
	}
</style>
