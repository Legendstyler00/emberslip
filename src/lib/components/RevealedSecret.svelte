<script lang="ts">
	import type { Snippet } from 'svelte';
	import CopyButton from './CopyButton.svelte';
	import EmberBurn from './EmberBurn.svelte';
	import Terminal from './Terminal.svelte';

	let {
		text,
		title = 'Your secret',
		burned,
		children
	}: { text: string; title?: string; burned: boolean; children: Snippet } = $props();
</script>

<section class="rt-panel revealed" class:burned aria-labelledby="secret-title">
	{#if burned}
		<EmberBurn />
	{/if}
	<div class="head">
		<h1 id="secret-title" class="h2">{title}</h1>
		<CopyButton {text} clearAfter={60} primary />
	</div>
	<label class="visually-hidden" for="secret">{title}</label>
	<Terminal title="gouda@kanal: ~/secret">
		<textarea id="secret" class="textarea" readonly rows="8" value={text}></textarea>
	</Terminal>
	<div class="status" class:notice={burned} class:notice--alarm={burned}>{@render children()}</div>
	<p class="hint">Copied text is removed from your clipboard after 60 seconds.</p>
</section>

<style>
	.revealed {
		position: relative;
		gap: var(--space-4);
	}

	.revealed.burned {
		animation: smoulder 2.8s ease-out;
	}

	@keyframes smoulder {
		0% {
			border-color: var(--alarm);
			box-shadow:
				0 0 0 1px var(--alarm),
				0 0 40px -6px var(--alarm);
		}
		100% {
			border-color: var(--line);
		}
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.status {
		font: var(--type-body-sm);
	}
</style>
