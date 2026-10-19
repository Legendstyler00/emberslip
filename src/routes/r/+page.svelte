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
	import Logo from '#lib/components/Logo.svelte';
	import StatusCard from '#lib/components/StatusCard.svelte';
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
{:else if view.kind === 'open'}
	<form class="card form" onsubmit={send}>
		<Logo size={44} />
		<div class="heading">
			<h1>Someone is asking you for a secret</h1>
			<p class="hint">
				This request is open until {formatDate(view.expiresAt)} ({formatRelative(view.expiresAt)}).
			</p>
		</div>

		{#if view.message}
			<figure>
				<figcaption class="label">Their message</figcaption>
				<blockquote>{view.message}</blockquote>
			</figure>
		{/if}

		<p class="warning">
			Only answer if you know who sent you this link. Anyone can create a request, so confirm it's
			really them through another channel if you're unsure.
		</p>

		<div>
			<label class="label" for="secret">Your secret</label>
			<textarea
				id="secret"
				class="textarea"
				rows="6"
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
				bind:value={secret}
				aria-invalid={tooLong}></textarea>
			{#if tooLong}
				<p class="error">This is too long. Answers can be up to about 64 KB.</p>
			{/if}
		</div>

		{#if error}
			<p class="error" role="alert">{error}</p>
		{/if}

		<button
			type="submit"
			class="btn btn-primary btn-block"
			disabled={busy || !secret.trim() || tooLong}
		>
			{#if busy}
				<span class="spinner" aria-hidden="true"></span>
				Encrypting…
			{:else}
				Encrypt and send
			{/if}
		</button>
		<p class="hint">
			Encrypted on this device with post-quantum encryption. Only the person who asked can read it,
			and it burns as soon as they do.
		</p>
	</form>
{:else if view.kind === 'sent'}
	<StatusCard title="Sent">
		<p class="hint">
			Your secret is encrypted and waiting for the person who asked. Only they can read it, once.
			This link can't be used again.
		</p>
	</StatusCard>
{:else if view.kind === 'answered'}
	<Tombstone
		title="This request has already been answered"
		body="Someone has already sent a secret through this link, and a request can only be answered once. If that wasn't you, let the person who asked know."
	/>
{:else if view.kind === 'expired'}
	<Tombstone
		title="This request has expired"
		body="It wasn't answered in time. Ask the person who sent it for a new link."
	/>
{:else if view.kind === 'missing'}
	<Tombstone
		title="There's nothing here"
		body="This request doesn't exist. Either the link is wrong, or it expired long ago."
	/>
{:else}
	<StatusCard title="Something went wrong">
		<p class="error" role="alert">{view.message}</p>
		<button type="button" class="btn" onclick={() => location.reload()}>Try again</button>
	</StatusCard>
{/if}

<style>
	h1 {
		font-size: 28px;
	}

	code {
		font-family: var(--font-mono);
		color: var(--ember-text);
	}

	.form {
		display: grid;
		gap: 20px;
	}

	.heading {
		display: grid;
		gap: 8px;
	}

	figure {
		margin: 0;
	}

	blockquote {
		margin: 0;
		padding: 12px 16px;
		border-left: 3px solid var(--ember);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		background: var(--surface-2);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.warning {
		color: var(--muted);
		font-size: 14px;
	}
</style>
