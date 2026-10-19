<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { openNote, peekNote, type BurnReason, type PeekResponse } from '#lib/client/api.ts';
	import { formatDate, formatRelative, plural } from '#lib/client/format.ts';
	import { errorMessage, watchFragment } from '#lib/client/fragment.ts';
	import type { Bytes } from '#lib/crypto/bytes.ts';
	import {
		decryptNote,
		deriveLinkToken,
		deriveNoteSecrets,
		parseNoteKey
	} from '#lib/crypto/note.ts';
	import Logo from '#lib/components/Logo.svelte';
	import RevealedSecret from '#lib/components/RevealedSecret.svelte';
	import StatusCard from '#lib/components/StatusCard.svelte';
	import Tombstone, { noteTombstones } from '#lib/components/Tombstone.svelte';

	type Active = Extract<PeekResponse, { status: 'active' }>;
	type View =
		| { kind: 'loading' }
		| { kind: 'invalid' }
		| { kind: 'gone'; burnedAt: number | null; reason: BurnReason | 'missing' }
		| { kind: 'ready'; note: Active }
		| { kind: 'revealed'; text: string; viewsLeft: number }
		| { kind: 'closed' }
		| { kind: 'error'; message: string };

	let view = $state<View>({ kind: 'loading' });
	let password = $state('');
	let passwordError = $state<string | null>(null);
	let busy = $state(false);

	let key: Bytes | null = null;
	let linkToken = '';

	onMount(() =>
		watchFragment(start, () => {
			if (view.kind === 'revealed') view = { kind: 'closed' };
		})
	);

	function start() {
		password = '';
		passwordError = null;
		key = parseNoteKey(location.hash);
		if (!key) {
			view = { kind: 'invalid' };
			return;
		}
		view = { kind: 'loading' };
		load(key);
	}

	async function load(key: Bytes) {
		try {
			linkToken = await deriveLinkToken(key);
			const note = await peekNote(linkToken);
			if (note.status === 'active') view = { kind: 'ready', note };
			else if (note.status === 'burned') view = { kind: 'gone', ...note };
			else view = { kind: 'gone', burnedAt: null, reason: 'missing' };
		} catch (err) {
			view = { kind: 'error', message: errorMessage(err) };
		}
	}

	async function reveal(event: SubmitEvent) {
		event.preventDefault();
		if (view.kind !== 'ready' || !key || busy) return;
		const { note } = view;
		busy = true;
		passwordError = null;
		try {
			const secrets = await deriveNoteSecrets(key, note.kdf, note.hasPassword ? password : null);
			const result = await openNote(linkToken, secrets.pwToken);
			switch (result.status) {
				case 'ok':
					try {
						const text = await decryptNote(secrets, note.kdf, result.iv, result.ciphertext);
						view = { kind: 'revealed', text, viewsLeft: result.viewsLeft };
					} catch {
						view = {
							kind: 'error',
							message: "This note couldn't be decrypted. The link may have been changed."
						};
					}
					password = '';
					// The key has done its job; keep it out of the address bar and history.
					goto(resolve('/n'), { replace: true, shallow: true, state: {} });
					break;
				case 'wrong-password':
					passwordError = `Wrong password. ${plural(result.attemptsLeft, 'attempt', 'attempts')} left before the note burns.`;
					break;
				case 'burned':
					view = { kind: 'gone', burnedAt: result.burnedAt, reason: result.reason };
					break;
				case 'missing':
					view = { kind: 'gone', burnedAt: null, reason: 'missing' };
			}
		} catch (err) {
			passwordError = errorMessage(err);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>A secret note for you · Emberslip</title>
</svelte:head>

{#if view.kind === 'loading'}
	<StatusCard loading>
		<p class="hint">Looking for your note…</p>
	</StatusCard>
{:else if view.kind === 'invalid'}
	<StatusCard title="This link is incomplete">
		<p class="hint">
			The part after the <code>#</code> is missing or damaged. Make sure you copied the whole link.
		</p>
	</StatusCard>
{:else if view.kind === 'gone'}
	<Tombstone burnedAt={view.burnedAt} {...noteTombstones[view.reason]} />
{:else if view.kind === 'ready'}
	{@const note = view.note}
	<form class="card ready" onsubmit={reveal}>
		<Logo size={44} />
		<div class="ready-text">
			<h1>Someone sent you a secret</h1>
			<p class="hint">
				{#if note.viewsLeft === 1}
					It burns as soon as you open it.
				{:else}
					It can be opened {plural(note.viewsLeft, 'more time', 'more times')}.
				{/if}
				It expires {formatRelative(note.expiresAt)} ({formatDate(note.expiresAt)}).
			</p>
		</div>

		{#if note.hasPassword}
			<div>
				<label class="label" for="password">This note is protected by a password</label>
				<input
					id="password"
					class="input"
					type="password"
					autocomplete="off"
					bind:value={password}
					aria-invalid={passwordError !== null}
					aria-describedby={passwordError ? 'password-error' : undefined}
				/>
			</div>
		{/if}

		{#if passwordError}
			<p id="password-error" class="error" role="alert">{passwordError}</p>
		{/if}

		<button
			type="submit"
			class="btn btn-primary btn-block"
			disabled={busy || (note.hasPassword && password === '')}
		>
			{#if busy}
				<span class="spinner" aria-hidden="true"></span>
				Decrypting…
			{:else}
				Reveal note
			{/if}
		</button>
		<p class="hint">
			Only reveal it when you're ready. Make sure nobody is looking at your screen.
		</p>
	</form>
{:else if view.kind === 'revealed'}
	<RevealedSecret text={view.text} burned={view.viewsLeft === 0}>
		{#if view.viewsLeft === 0}
			This note has now burned. Copy what you need before you leave this page. Once you close it,
			the note is gone.
		{:else}
			It can be opened {plural(view.viewsLeft, 'more time', 'more times')} before it burns.
		{/if}
	</RevealedSecret>
{:else if view.kind === 'closed'}
	<StatusCard title="The note was cleared">
		<p class="hint">You left the page, so the decrypted note was removed from it.</p>
	</StatusCard>
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

	.ready {
		display: grid;
		gap: 20px;
	}

	.ready-text {
		display: grid;
		gap: 8px;
	}
</style>
