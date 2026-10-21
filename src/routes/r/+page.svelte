<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { peekRequest, sendAnswer } from '#lib/client/api.ts';
	import { formatDate, formatRelative } from '#lib/client/format.ts';
	import { errorMessage, watchFragment } from '#lib/client/fragment.ts';
	import type { Bytes } from '#lib/crypto/bytes.ts';
	import { fitsInEnvelope } from '#lib/crypto/envelope.ts';
	import {
		deriveRespondToken,
		encryptAnswer,
		openRequest,
		parseSecret,
		SHARE_SECRET_BYTES
	} from '#lib/crypto/request.ts';
	import Gouda from '#lib/components/Gouda.svelte';
	import StatusCard from '#lib/components/StatusCard.svelte';
	import Terminal from '#lib/components/Terminal.svelte';
	import Tombstone from '#lib/components/Tombstone.svelte';

	type View =
		| { kind: 'loading' }
		| { kind: 'invalid' }
		| { kind: 'open'; publicKey: Bytes; message: string; expiresAt: number }
		| { kind: 'sent' }
		| { kind: 'answered' }
		| { kind: 'expired' }
		| { kind: 'missing' }
		| { kind: 'error'; message: string };

	let view = $state<View>({ kind: 'loading' });
	let secret = $state('');
	let busy = $state(false);
	let error = $state<string | null>(null);
	let respondToken = '';

	const tooLong = $derived(!fitsInEnvelope(secret));

	onMount(() =>
		watchFragment(start, () => {
			secret = '';
		})
	);

	function start() {
		error = null;
		const shareSecret = parseSecret(location.hash, SHARE_SECRET_BYTES);
		if (!shareSecret) {
			view = { kind: 'invalid' };
			return;
		}
		view = { kind: 'loading' };
		load(shareSecret);
	}

	async function load(shareSecret: Bytes) {
		try {
			respondToken = await deriveRespondToken(shareSecret);
			const request = await peekRequest(respondToken);
			if (request.status !== 'open') {
				view = { kind: request.status };
				return;
			}
			const { publicKey, message } = await openRequest(
				shareSecret,
				request.sealedIv,
				request.sealed
			);
			view = { kind: 'open', publicKey, message, expiresAt: request.expiresAt };
		} catch (err) {
			view = { kind: 'error', message: errorMessage(err) };
		}
	}

	async function send(event: SubmitEvent) {
		event.preventDefault();
		if (view.kind !== 'open' || busy || !secret.trim() || tooLong) return;
		busy = true;
		error = null;
		try {
			const answer = await encryptAnswer(view.publicKey, secret);
			const result = await sendAnswer(respondToken, answer);
			view = { kind: result.status === 'sent' ? 'sent' : result.status };
			secret = '';
			goto(resolve('/r'), { replace: true, shallow: true, state: {} });
		} catch (err) {
			error = errorMessage(err);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Someone is asking you for a secret · Emberslip</title>
</svelte:head>

<section class="rt-section">
	{#if view.kind === 'answered'}
		<Tombstone
			title="This request has already been answered"
			body="Someone has already sent a secret through this link, and a request can only be answered once. If that wasn't you, let the person who asked know."
			quip="Somebody beat you to it. Faster than me at the cheese counter."
		/>
	{:else if view.kind === 'expired'}
		<Tombstone
			title="This request has expired"
			body="It wasn't answered in time. Ask the person who sent it for a new link."
			quip="Too late! It went stale like old cheese."
		/>
	{:else if view.kind === 'missing'}
		<Tombstone
			title="There's nothing here"
			body="This request doesn't exist. Either the link is wrong, or it expired long ago."
		/>
	{:else}
		<div class="rt-split rt-split--top">
			{#if view.kind === 'loading'}
				<StatusCard loading>
					<p class="hint">Opening the request…</p>
				</StatusCard>
			{:else if view.kind === 'invalid'}
				<StatusCard title="This link is incomplete">
					<p class="hint">
						The part after the <code>#</code> is missing or damaged. Make sure you copied the whole link.
					</p>
				</StatusCard>
				<Gouda mood="panik">Half a link is like half a cheese. Nobody wants that.</Gouda>
			{:else if view.kind === 'open'}
				<form class="rt-panel form" onsubmit={send}>
					<div class="rt-section-head">
						<p class="label kicker">Incoming request</p>
						<h1 class="h2">Someone is asking you for a secret</h1>
						<p class="hint">
							This request is open until {formatDate(view.expiresAt)} ({formatRelative(
								view.expiresAt
							)}).
						</p>
					</div>

					{#if view.message}
						<figure>
							<figcaption class="label">Their message</figcaption>
							<blockquote>{view.message}</blockquote>
						</figure>
					{/if}

					<p class="notice">
						Only answer if you know who sent you this link. Anyone can create a request, so confirm
						it's really them through another channel if you're unsure.
					</p>

					<div>
						<label class="label field-label" for="secret">Your secret</label>
						<Terminal title="gouda@kanal: ~/answer">
							<textarea
								id="secret"
								class="textarea"
								rows="6"
								autocomplete="off"
								autocapitalize="off"
								spellcheck="false"
								bind:value={secret}
								aria-invalid={tooLong}></textarea>
						</Terminal>
						{#if tooLong}
							<p class="error">This is too long. Answers can be up to about 64 KB.</p>
						{/if}
					</div>

					{#if error}
						<p class="error" role="alert">{error}</p>
					{/if}

					<div class="submit">
						<button
							type="submit"
							class="rt-btn rt-btn--primary rt-btn--md rt-btn--block rt-glitch"
							data-text="Encrypt and send"
							disabled={busy || !secret.trim() || tooLong}
						>
							{#if busy}
								<span class="busy-cursor" aria-hidden="true"></span>
								Encrypting…
							{:else}
								Encrypt and send
							{/if}
						</button>
						<p class="hint">
							Encrypted on this device with post-quantum encryption. Only the person who asked can
							read it, and it burns as soon as they do.
						</p>
					</div>
				</form>
				<Gouda mood="frech">I only deliver to the one who asked. Promise on my whiskers.</Gouda>
			{:else if view.kind === 'sent'}
				<StatusCard title="Sent">
					<p class="hint">
						Your secret is encrypted and waiting for the person who asked. Only they can read it,
						once. This link can't be used again.
					</p>
				</StatusCard>
				<Gouda mood="zufrieden">Delivered. Not a single nibble taken.</Gouda>
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

	.form {
		gap: var(--space-6);
	}

	figure {
		display: grid;
		gap: var(--space-2);
		margin: 0;
	}

	/* Their own words, so not in a Gouda bubble: a quote on the sunken surface. */
	blockquote {
		margin: 0;
		padding: var(--space-3) var(--space-4);
		background: var(--surface-sunken);
		border-left: 2px solid var(--cyan);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.submit {
		display: grid;
		gap: var(--space-3);
		text-align: center;
	}
</style>
