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

<section class="card result" aria-labelledby="result-title">
	<div>
		<p class="eyebrow">Ready to share</p>
		<h2 id="result-title">Your secret link</h2>
	</div>

	<div class="link-row">
		<label class="visually-hidden" for="link">Secret link</label>
		<input id="link" class="input link" readonly value={note.link} onfocus={selectAll} />
		<CopyButton text={note.link} label="Copy link" />
	</div>

	<LinkQr link={note.link} label="QR code of the secret link" />

	<ul class="facts">
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
		<div class="manage">
			<h3>Your private status link</h3>
			<p class="hint">
				Keep this one to yourself. It shows when the note was opened and lets you burn it early, but
				it can't decrypt the note.
			</p>
			<div class="link-row">
				<label class="visually-hidden" for="manage-link">Status link</label>
				<input
					id="manage-link"
					class="input link"
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

	<button type="button" class="btn btn-block" onclick={onreset}>Create another note</button>
</section>

<style>
	.result {
		display: grid;
		gap: 20px;
	}

	h2 {
		font-size: 26px;
		margin-top: 4px;
	}

	.link-row {
		display: flex;
		gap: 8px;
	}

	.link {
		font-family: var(--font-mono);
		font-size: 14px;
		min-width: 0;
	}

	@media (max-width: 520px) {
		.link-row {
			flex-direction: column;
		}
	}

	.facts {
		display: grid;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.facts li {
		padding-left: 22px;
		position: relative;
	}

	.facts li::before {
		content: '';
		position: absolute;
		left: 4px;
		top: 0.62em;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--ember), var(--ember-2));
	}

	.manage {
		display: grid;
		gap: 10px;
		padding: 18px;
		border: 1px solid rgb(255 122 47 / 0.45);
		border-radius: var(--radius-sm);
		background: var(--surface-2);
	}

	h3 {
		font-family: var(--font-sans);
		font-size: 16px;
		font-weight: 650;
	}

	.notice {
		border-left: 3px solid var(--ember);
		background: var(--surface-2);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		padding: 10px 14px;
		font-size: 15px;
	}
</style>
