<script lang="ts">
	import type { Snippet } from 'svelte';
	import CopyButton from './CopyButton.svelte';
	import EmberBurn from './EmberBurn.svelte';

	let {
		text,
		title = 'Your secret',
		burned,
		children
	}: { text: string; title?: string; burned: boolean; children: Snippet } = $props();
</script>

<section class="card revealed" class:burned aria-labelledby="secret-title">
	{#if burned}
		<EmberBurn />
	{/if}
	<div class="head">
		<h1 id="secret-title">{title}</h1>
		<CopyButton {text} clearAfter={60} />
	</div>
	<label class="visually-hidden" for="secret">{title}</label>
	<textarea id="secret" class="textarea" readonly rows="8" value={text}></textarea>
	<div class="status">{@render children()}</div>
	<p class="hint">Copied text is removed from your clipboard after 60 seconds.</p>
</section>

<style>
	.revealed {
		position: relative;
		display: grid;
		gap: 16px;
	}

	.revealed.burned {
		animation: smoulder 2.8s ease-out;
	}

	@keyframes smoulder {
		0% {
			border-color: var(--ember);
			box-shadow:
				0 0 0 1px var(--ember),
				0 0 40px -6px var(--ember);
		}
		100% {
			border-color: var(--border);
		}
	}

	h1 {
		font-size: 28px;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.status {
		font-size: 15px;
	}
</style>
