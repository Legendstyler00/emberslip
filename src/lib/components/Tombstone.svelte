<script lang="ts" module>
	import type { BurnReason } from '../client/api';

	export const noteTombstones: Record<BurnReason | 'missing', { title: string; body: string }> = {
		viewed: {
			title: 'This note has already burned',
			body: "It was opened and then destroyed. If you didn't open it yourself, someone else got to the link first. Let the sender know so they can change the secret."
		},
		expired: {
			title: 'This note has expired',
			body: 'Nobody opened it in time, so it was destroyed unread. Ask the sender for a new link.'
		},
		password: {
			title: 'This note was destroyed',
			body: 'The wrong password was entered too many times, so the note burned to protect its contents. Ask the sender for a new link.'
		},
		creator: {
			title: 'This note was burned by its sender',
			body: 'The person who sent it destroyed it early. Ask them for a new link if you still need it.'
		},
		missing: {
			title: "There's nothing here",
			body: "This doesn't exist. Either the link is wrong, or it burned so long ago that even its traces are gone."
		}
	};
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatDate } from '../client/format';
	import Gouda from './Gouda.svelte';
	import Terminal from './Terminal.svelte';

	let {
		title,
		body,
		burnedAt = null,
		quip = 'I swear it was here a second ago!'
	}: { title: string; body: string; burnedAt?: number | null; quip?: string } = $props();
</script>

<!-- Laid out like the 404 page of ratte.lol. -->
<div class="rt-split rt-split--top">
	<section class="rt-panel tombstone" aria-labelledby="tombstone-title">
		<h1 id="tombstone-title" class="h2">{title}</h1>
		{#if burnedAt !== null}
			<p class="meta when">Burned {formatDate(burnedAt)}</p>
		{/if}
		<p class="body">{body}</p>
		<a
			class="rt-btn rt-btn--primary rt-btn--md rt-glitch"
			data-text="Create a note of your own"
			href={resolve('/')}><span class="rt-btn-label">Create a note of your own</span></a
		>
	</section>

	<div class="aside">
		<Terminal
			lines={[{ text: 'cat ./note' }, { kind: 'err', text: 'nothing left but ash' }]}
			cursor
		/>
		<Gouda mood="panik">{quip}</Gouda>
	</div>
</div>

<style>
	.tombstone {
		gap: var(--space-4);
		align-content: start;
	}

	.when {
		color: var(--alarm);
	}

	.body {
		color: var(--ink-muted);
		max-width: 52ch;
	}

	.rt-btn {
		justify-self: start;
		margin-top: var(--space-2);
	}

	.aside {
		display: grid;
		gap: var(--space-6);
		align-content: start;
	}
</style>
