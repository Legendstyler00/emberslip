<script lang="ts">
	import { formatDate, formatRelative, plural } from '../client/format';
	import CopyButton from './CopyButton.svelte';
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

	<p class="hint">
		This link is only shown once. Anyone who has it can open the note, and we can't recover it if it
		gets lost.
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

	.notice {
		border-left: 3px solid var(--ember);
		background: var(--surface-2);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		padding: 10px 14px;
		font-size: 15px;
	}
</style>
