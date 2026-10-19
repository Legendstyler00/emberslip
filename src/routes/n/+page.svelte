<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		ApiRequestError,
		openNote,
		peekNote,
		type BurnReason,
		type PeekResponse
	} from '#lib/client/api.ts';
	import { formatDate, formatRelative, plural } from '#lib/client/format.ts';
	import type { Bytes } from '#lib/crypto/bytes.ts';
	import {
		decryptNote,
		deriveLinkToken,
		deriveNoteSecrets,
		parseNoteKey
	} from '#lib/crypto/note.ts';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import EmberBurn from '#lib/components/EmberBurn.svelte';
	import Logo from '#lib/components/Logo.svelte';
	import Tombstone from '#lib/components/Tombstone.svelte';

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

	onMount(() => {
		start();

		// Don't leave the plaintext around for the back/forward cache.
		const clear = () => {
			if (view.kind === 'revealed') view = { kind: 'closed' };
		};
		// Pasting another link into this tab only changes the fragment.
		const restart = () => {
			if (location.hash) start();
		};
		window.addEventListener('pagehide', clear);
		window.addEventListener('hashchange', restart);
		return () => {
			window.removeEventListener('pagehide', clear);
			window.removeEventListener('hashchange', restart);
		};
	});

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
			view = { kind: 'error', message: message(err) };
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
			passwordError = message(err);
		} finally {
			busy = false;
		}
	}

	function message(err: unknown): string {
		return err instanceof ApiRequestError || err instanceof Error
			? err.message
			: 'Something went wrong. Please try again.';
	}
</script>

<svelte:head>
	<title>A secret note for you · Emberslip</title>
</svelte:head>

{#if view.kind === 'loading'}
	<div class="card center" aria-busy="true">
		<span class="spinner" aria-hidden="true"></span>
		<p class="hint">Looking for your note…</p>
	</div>
{:else if view.kind === 'invalid'}
	<section class="card center">
		<h1>This link is incomplete</h1>
		<p class="hint">
			The part after the <code>#</code> is missing or damaged. Make sure you copied the whole link.
		</p>
	</section>
{:else if view.kind === 'gone'}
	<Tombstone burnedAt={view.burnedAt} reason={view.reason} />
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
			<div class="password">
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
	<section class="card revealed" class:burned={view.viewsLeft === 0} aria-labelledby="note-title">
		{#if view.viewsLeft === 0}
			<EmberBurn />
		{/if}
		<div class="revealed-head">
			<h1 id="note-title">Your secret</h1>
			<CopyButton text={view.text} clearAfter={60} />
		</div>
		<label class="visually-hidden" for="secret">Secret note</label>
		<textarea id="secret" class="textarea" readonly rows="8" value={view.text}></textarea>
		{#if view.viewsLeft === 0}
			<p class="status">
				This note has now burned. Copy what you need before you leave this page. Once you close it,
				the note is gone.
			</p>
		{:else}
			<p class="status">
				It can be opened {plural(view.viewsLeft, 'more time', 'more times')} before it burns.
			</p>
		{/if}
		<p class="hint">Copied text is removed from your clipboard after 60 seconds.</p>
	</section>
{:else if view.kind === 'closed'}
	<section class="card center">
		<h1>The note was cleared</h1>
		<p class="hint">You left the page, so the decrypted note was removed from it.</p>
	</section>
{:else}
	<section class="card center">
		<h1>Something went wrong</h1>
		<p class="error" role="alert">{view.message}</p>
		<button type="button" class="btn" onclick={() => location.reload()}>Try again</button>
	</section>
{/if}

<style>
	.center {
		display: grid;
		justify-items: center;
		gap: 14px;
		text-align: center;
		padding-block: 36px;
	}

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

	.revealed-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.status {
		font-size: 15px;
	}
</style>
