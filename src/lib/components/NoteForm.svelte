<script lang="ts" module>
	export interface CreatedNote {
		link: string;
		views: number;
		expiresAt: number;
		hasPassword: boolean;
		/** Private status link, if the creator asked for one. */
		manageLink: string | null;
	}
</script>

<script lang="ts">
	import { toBase64Url } from '../crypto/bytes';
	import { fitsInEnvelope } from '../crypto/envelope';
	import {
		deriveManageToken,
		encryptNote,
		generateManageKey,
		generateNoteKey
	} from '../crypto/note';
	import { createNote } from '../client/api';
	import Segmented from './Segmented.svelte';
	import Terminal from './Terminal.svelte';

	let { oncreated }: { oncreated: (note: CreatedNote) => void } = $props();

	const viewOptions = [1, 2, 3, 5, 10].map((v) => ({ value: v, label: String(v) }));
	const ttlOptions = [
		{ value: 300, label: '5 minutes' },
		{ value: 3600, label: '1 hour' },
		{ value: 86400, label: '1 day' },
		{ value: 604800, label: '7 days' }
	];

	let text = $state('');
	let views = $state(1);
	let ttl = $state(86400);
	let usePassword = $state(false);
	let password = $state('');
	let showPassword = $state(false);
	let wantStatusLink = $state(false);
	let busy = $state(false);
	let error = $state<string | null>(null);

	const tooLong = $derived(!fitsInEnvelope(text));
	const canSubmit = $derived(
		!busy && text.trim() !== '' && !tooLong && (!usePassword || password !== '')
	);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSubmit) return;
		busy = true;
		error = null;
		try {
			const key = generateNoteKey();
			const manageKey = wantStatusLink ? generateManageKey() : null;
			const [payload, manageToken] = await Promise.all([
				encryptNote(key, text, usePassword ? password : null),
				manageKey && deriveManageToken(manageKey)
			]);
			const created = await createNote({ ...payload, views, ttl, manageToken });
			oncreated({
				link: new URL(`/n#${toBase64Url(key)}`, location.origin).href,
				views: created.views,
				expiresAt: created.expiresAt,
				hasPassword: usePassword,
				manageLink: manageKey && new URL(`/manage#${toBase64Url(manageKey)}`, location.origin).href
			});
			text = '';
			password = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
		} finally {
			busy = false;
		}
	}
</script>

<form class="rt-panel form" onsubmit={submit}>
	<div>
		<label class="label field-label" for="note">Your secret</label>
		<Terminal title="gouda@kanal: ~/new-note">
			<textarea
				id="note"
				class="textarea"
				rows="7"
				placeholder="Paste a password, an API key, or anything else that shouldn't linger in chat history."
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
				bind:value={text}
				aria-invalid={tooLong}
				aria-describedby={tooLong ? 'note-too-long' : undefined}></textarea>
		</Terminal>
		{#if tooLong}
			<p id="note-too-long" class="error">This note is too long. Notes can be up to about 64 KB.</p>
		{/if}
	</div>

	<div class="options">
		<Segmented
			legend="Views before it burns"
			name="views"
			options={viewOptions}
			bind:value={views}
		/>
		<Segmented
			legend="Burns after this time even if unread"
			name="ttl"
			options={ttlOptions}
			bind:value={ttl}
		/>
	</div>

	<div class="option">
		<label class="rt-check-row">
			<input type="checkbox" class="rt-check" bind:checked={usePassword} />
			Protect with a password
		</label>
		{#if usePassword}
			<div class="password-row">
				<label class="visually-hidden" for="password">Password</label>
				<input
					id="password"
					class="input"
					type={showPassword ? 'text' : 'password'}
					autocomplete="new-password"
					placeholder="Password"
					bind:value={password}
				/>
				<button
					type="button"
					class="rt-btn rt-btn--secondary rt-btn--md"
					onclick={() => (showPassword = !showPassword)}
				>
					{showPassword ? 'Hide' : 'Show'}
				</button>
			</div>
			<p class="hint">
				Send the password through a different channel than the link. After 5 wrong attempts the note
				burns.
			</p>
		{/if}
	</div>

	<div class="option">
		<label class="rt-check-row">
			<input
				type="checkbox"
				class="rt-check"
				bind:checked={wantStatusLink}
				aria-describedby="status-link-hint"
			/>
			Give me a private status link
		</label>
		<p id="status-link-hint" class="hint">
			Shows when the note is opened and lets you burn it early. Open times are stored rounded to the
			minute, and nothing about the reader is.
		</p>
	</div>

	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}

	<div class="submit">
		<button
			type="submit"
			class="rt-btn rt-btn--primary rt-btn--md rt-btn--block rt-glitch"
			data-text="Create secret link"
			disabled={!canSubmit}
		>
			{#if busy}
				<span class="busy-cursor" aria-hidden="true"></span>
				{usePassword ? 'Encrypting with your password…' : 'Encrypting…'}
			{:else}
				Create secret link
			{/if}
		</button>
		<p class="hint">Encrypted in your browser before it's sent. We never see the key.</p>
	</div>
</form>

<style>
	.form {
		gap: var(--space-6);
	}

	.options {
		display: grid;
		gap: var(--space-4);
	}

	.option,
	.submit {
		display: grid;
		gap: var(--space-2);
	}

	.rt-check-row {
		width: fit-content;
	}

	.password-row {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}

	.submit {
		gap: var(--space-3);
		text-align: center;
	}
</style>
