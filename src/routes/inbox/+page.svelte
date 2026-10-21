<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { checkInbox, openAnswer, type InboxResponse } from '#lib/client/api.ts';
	import { formatDate, formatRelative } from '#lib/client/format.ts';
	import { errorMessage, watchFragment } from '#lib/client/fragment.ts';
	import type { Bytes } from '#lib/crypto/bytes.ts';
	import { KEM_SEED_BYTES } from '#lib/crypto/kem.ts';
	import { decryptAnswer, deriveInboxToken, parseSecret } from '#lib/crypto/request.ts';
	import Gouda from '#lib/components/Gouda.svelte';
	import RevealedSecret from '#lib/components/RevealedSecret.svelte';
	import StatusCard from '#lib/components/StatusCard.svelte';
	import Terminal from '#lib/components/Terminal.svelte';
	import Tombstone from '#lib/components/Tombstone.svelte';

	const POLL_MS = 15_000;

	type View =
		| { kind: 'loading' }
		| { kind: 'invalid' }
		| { kind: 'waiting'; expiresAt: number }
		| { kind: 'answered'; answeredAt: number; expiresAt: number }
		| { kind: 'revealed'; text: string }
		| { kind: 'burned'; burnedAt: number; reason: 'viewed' | 'expired' }
		| { kind: 'missing' }
		| { kind: 'closed' }
		| { kind: 'error'; message: string };

	let view = $state<View>({ kind: 'loading' });
	let busy = $state(false);
	let error = $state<string | null>(null);
	let seed: Bytes | null = null;
	let inboxToken = '';

	onMount(() =>
		watchFragment(start, () => {
			if (view.kind === 'revealed') view = { kind: 'closed' };
		})
	);

	$effect(() => {
		if (view.kind !== 'waiting') return;
		const timer = setInterval(refresh, POLL_MS);
		return () => clearInterval(timer);
	});

	function start() {
		error = null;
		seed = parseSecret(location.hash, KEM_SEED_BYTES);
		if (!seed) {
			view = { kind: 'invalid' };
			return;
		}
		view = { kind: 'loading' };
		deriveInboxToken(seed)
			.then((token) => {
				inboxToken = token;
				return refresh();
			})
			.catch((err) => (view = { kind: 'error', message: errorMessage(err) }));
	}

	async function refresh() {
		if (document.hidden && view.kind === 'waiting') return;
		try {
			show(await checkInbox(inboxToken));
		} catch (err) {
			if (view.kind !== 'waiting') view = { kind: 'error', message: errorMessage(err) };
		}
	}

	function show(state: InboxResponse) {
		if (state.status === 'missing') view = { kind: 'missing' };
		else view = { kind: state.status, ...state } as View;
	}

	async function reveal() {
		if (view.kind !== 'answered' || !seed || busy) return;
		busy = true;
		error = null;
		try {
			const result = await openAnswer(inboxToken);
			if (result.status !== 'ok') {
				show(result);
				return;
			}
			try {
				view = { kind: 'revealed', text: await decryptAnswer(seed, result) };
			} catch {
				view = { kind: 'error', message: "The answer couldn't be decrypted." };
			}
			goto(resolve('/inbox'), { replace: true, shallow: true, state: {} });
		} catch (err) {
			error = errorMessage(err);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Your inbox · Emberslip</title>
</svelte:head>

<section class="rt-section">
	{#if view.kind === 'burned'}
		{#if view.reason === 'viewed'}
			<Tombstone
				burnedAt={view.burnedAt}
				title="This answer has already been read"
				body="It was revealed and then destroyed. If that wasn't you, someone else has your inbox link."
			/>
		{:else}
			<Tombstone
				burnedAt={view.burnedAt}
				title="This request has expired"
				body="Either nobody answered in time, or the answer wasn't read in time. Create a new request if you still need the secret."
				quip="Too late! It went stale like old cheese."
			/>
		{/if}
	{:else if view.kind === 'missing'}
		<Tombstone
			title="There's nothing here"
			body="This inbox doesn't exist. Either the link is wrong, or it expired long ago."
		/>
	{:else}
		<div class="rt-split rt-split--top">
			{#if view.kind === 'loading'}
				<StatusCard loading>
					<p class="hint">Checking your inbox…</p>
				</StatusCard>
			{:else if view.kind === 'invalid'}
				<StatusCard title="This link is incomplete">
					<p class="hint">
						The part after the <code>#</code> is missing or damaged. Make sure you copied the whole link.
					</p>
				</StatusCard>
				<Gouda mood="panik">Half a link is like half a cheese. Nobody wants that.</Gouda>
			{:else if view.kind === 'waiting'}
				<StatusCard title="Waiting for an answer">
					<Terminal
						lines={[
							{ text: 'watch ./inbox' },
							{ kind: 'comment', text: 'nothing yet, still looking' }
						]}
						cursor
					/>
					<p class="hint">
						Nobody has answered yet. This page checks every 15 seconds, or you can close it and come
						back with the same link. The request expires {formatRelative(view.expiresAt)} ({formatDate(
							view.expiresAt
						)}).
					</p>
				</StatusCard>
				<Gouda mood="frech">I'm on watch. Cheese break included.</Gouda>
			{:else if view.kind === 'answered'}
				<section class="rt-panel answered">
					<div class="rt-section-head">
						<p class="label kicker">Inbox</p>
						<h1 class="h2">Your answer has arrived</h1>
						<p class="hint">
							Answered {formatDate(view.answeredAt)}. It burns as soon as you reveal it. If you
							don't read it, it expires {formatRelative(view.expiresAt)}.
						</p>
					</div>
					{#if error}
						<p class="error" role="alert">{error}</p>
					{/if}
					<div class="submit">
						<button
							type="button"
							class="rt-btn rt-btn--primary rt-btn--md rt-btn--block rt-glitch"
							data-text="Reveal answer"
							disabled={busy}
							onclick={reveal}
						>
							{#if busy}
								<span class="busy-cursor" aria-hidden="true"></span>
								Decrypting…
							{:else}
								Reveal answer
							{/if}
						</button>
						<p class="hint">Make sure nobody is looking at your screen.</p>
					</div>
				</section>
				<Gouda mood="zufrieden">Fresh delivery, still sealed. I only sniffed the envelope.</Gouda>
			{:else if view.kind === 'revealed'}
				<RevealedSecret title="Your answer" text={view.text} burned>
					The answer has now burned. Copy what you need before you leave this page.
				</RevealedSecret>
				<Gouda mood="panik">It's going up in flames! Grab what you need, quick.</Gouda>
			{:else if view.kind === 'closed'}
				<StatusCard title="The answer was cleared">
					<p class="hint">You left the page, so the decrypted answer was removed from it.</p>
				</StatusCard>
				<Gouda mood="zufrieden">Swept clean. Not a crumb left on the screen.</Gouda>
			{:else}
				<StatusCard title="Something went wrong">
					<p class="error" role="alert">{view.message}</p>
					<button
						type="button"
						class="rt-btn rt-btn--secondary rt-btn--md"
						onclick={() => location.reload()}>Try again</button
					>
				</StatusCard>
				<Gouda mood="panik">That wasn't me. Probably.</Gouda>
			{/if}
		</div>
	{/if}
</section>

<style>
	.kicker {
		color: var(--slime);
	}

	.answered {
		gap: var(--space-6);
	}

	.submit {
		display: grid;
		gap: var(--space-3);
		text-align: center;
	}
</style>
