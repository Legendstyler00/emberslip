<script lang="ts">
	import { resolve } from '$app/paths';
	import type { BurnReason } from '../client/api';
	import { formatDate } from '../client/format';
	import Logo from './Logo.svelte';

	let { burnedAt, reason }: { burnedAt: number | null; reason: BurnReason | 'missing' } = $props();

	const copy: Record<BurnReason | 'missing', { title: string; body: string }> = {
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
		missing: {
			title: "There's nothing here",
			body: "This note doesn't exist. Either the link is wrong, or the note burned so long ago that even its traces are gone."
		}
	};

	const text = $derived(copy[reason]);
</script>

<section class="card tombstone" aria-labelledby="tombstone-title">
	<Logo size={40} lit={false} />
	<h1 id="tombstone-title">{text.title}</h1>
	{#if burnedAt !== null}
		<p class="when">Burned {formatDate(burnedAt)}</p>
	{/if}
	<p class="body">{text.body}</p>
	<a class="btn" href={resolve('/')}>Create a note of your own</a>
</section>

<style>
	.tombstone {
		display: grid;
		justify-items: center;
		gap: 12px;
		text-align: center;
		padding-block: 36px;
		background:
			radial-gradient(400px 160px at 50% 0, rgb(139 133 128 / 0.12), transparent 70%),
			var(--surface);
	}

	h1 {
		font-size: 28px;
		margin-top: 6px;
	}

	.when {
		color: var(--ash);
		font-size: 14px;
		font-weight: 550;
	}

	.body {
		color: var(--muted);
		max-width: 46ch;
		margin-bottom: 8px;
	}
</style>
