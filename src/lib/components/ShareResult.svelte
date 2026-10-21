<script lang="ts">
	import { formatDate, formatRelative, plural } from '../client/format';
	import CopyButton from './CopyButton.svelte';
	import LinkQr from './LinkQr.svelte';
	import type { CreatedNote } from './NoteForm.svelte';

	let { note, onreset }: { note: CreatedNote; onreset: () => void } = $props();

	function selectAll(event: FocusEvent) {
		(event.currentTarget as HTMLInputElement).select();
	}
</script>

<section class="rt-panel result" aria-labelledby="result-title">
	<div class="rt-section-head">
		<p class="label kicker">Ready to share</p>
		<h2 id="result-title">Your secret link</h2>
	</div>

	<div class="link-row">
		<label class="visually-hidden" for="link">Secret link</label>
		<input id="link" class="input input--mono" readonly value={note.link} onfocus={selectAll} />
		<CopyButton text={note.link} label="Copy link" primary />
	</div>

	<LinkQr link={note.link} label="QR code of the secret link" />

	<ul class="rt-facts">
		<li>
			Burns after <strong>{plural(note.views, 'view', 'views')}</strong>
		</li>
		<li>
			Expires <strong>{formatRelative(note.expiresAt)}</strong>
			<span class="hint">({formatDate(note.expiresAt)})</span>
		</li>
		{#if note.hasPassword}
			<li>Needs the <strong>password</strong> you chose</li>
		{/if}
	</ul>

	{#if note.hasPassword}
		<p class="notice">
			Send the password separately, for example by phone or in a different messenger, so that the
			link alone is not enough.
		</p>
	{/if}

	{#if note.manageLink}
		<div class="private">
			<h3>Your private status link</h3>
			<p class="hint">
				Keep this one to yourself. It shows when the note was opened and lets you burn it early, but
				it can't decrypt the note.
			</p>
			<div class="link-row">
				<label class="visually-hidden" for="manage-link">Status link</label>
				<input
					id="manage-link"
					class="input input--mono"
					readonly
					value={note.manageLink}
					onfocus={selectAll}
				/>
				<CopyButton text={note.manageLink} label="Copy" />
			</div>
		</div>
	{/if}

	<p class="hint">
		{#if note.manageLink}
			These links are only shown once, and we can't recover them if they get lost. Anyone who has
			the secret link can open the note.
		{:else}
			This link is only shown once. Anyone who has it can open the note, and we can't recover it if
			it gets lost.
		{/if}
	</p>

	<button type="button" class="rt-btn rt-btn--secondary rt-btn--md rt-btn--block" onclick={onreset}
		>Create another note</button
	>
</section>

<style>
	.kicker {
		color: var(--slime);
	}

	.link-row {
		display: flex;
		gap: var(--space-2);
	}

	.link-row .input {
		min-width: 0;
	}

	@media (width<=959.98px) {
		.link-row {
			flex-direction: column;
		}
	}

	/* Only for the person who made the note: framed like Gouda's speech bubble. */
	.private {
		display: grid;
		gap: var(--space-3);
		padding: var(--space-4);
		background: var(--surface-sunken);
		border: 2px solid var(--magenta);
		border-radius: var(--radius-md);
	}

	h3 {
		color: var(--magenta);
	}
</style>
