<script lang="ts">
	import { onMount } from 'svelte';
	import { burnNote, noteStatus, type BurnReason, type ManageResponse } from '#lib/client/api.ts';
	import { formatDate, formatRelative, plural } from '#lib/client/format.ts';
	import { errorMessage, watchFragment } from '#lib/client/fragment.ts';
	import type { Bytes } from '#lib/crypto/bytes.ts';
	import { deriveManageToken, parseNoteKey } from '#lib/crypto/note.ts';
	import StatusCard from '#lib/components/StatusCard.svelte';

	type Found = Exclude<ManageResponse, { status: 'missing' }>;
	type View =
		| { kind: 'loading' }
		| { kind: 'invalid' }
		| { kind: 'missing' }
		| { kind: 'found'; note: Found }
		| { kind: 'error'; message: string };

	const burnedBecause: Record<BurnReason, string> = {
		viewed: 'It was opened as many times as you allowed.',
		expired: 'Nobody opened it before it expired.',
		password: 'Someone entered the wrong password too many times.',
		creator: 'You burned it with this link.'
	};

	let view = $state<View>({ kind: 'loading' });
	let confirming = $state(false);
	let busy = $state(false);
	let actionError = $state<string | null>(null);

	let manageToken = '';

	// The fragment stays in the address bar so the page can be bookmarked and reloaded.
	onMount(() => watchFragment(start, () => {}));

	function start() {
		confirming = false;
		actionError = null;
		const key = parseNoteKey(location.hash);
		if (!key) {
			view = { kind: 'invalid' };
			return;
		}
		view = { kind: 'loading' };
		load(key);
	}

	async function load(key: Bytes) {
		try {
			manageToken = await deriveManageToken(key);
			show(await noteStatus(manageToken));
		} catch (err) {
			view = { kind: 'error', message: errorMessage(err) };
		}
	}

	function show(result: ManageResponse) {
		view = result.status === 'missing' ? { kind: 'missing' } : { kind: 'found', note: result };
	}

	async function act(request: () => Promise<ManageResponse>) {
		if (busy) return;
		busy = true;
		actionError = null;
		try {
			show(await request());
			confirming = false;
		} catch (err) {
			actionError = errorMessage(err);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Note status · Emberslip</title>
</svelte:head>

{#if view.kind === 'loading'}
	<StatusCard loading>
		<p class="hint">Looking up your note…</p>
	</StatusCard>
{:else if view.kind === 'invalid'}
	<StatusCard title="This link is incomplete">
		<p class="hint">
			The part after the <code>#</code> is missing or damaged. Make sure you copied the whole link.
		</p>
	</StatusCard>
{:else if view.kind === 'missing'}
	<StatusCard title="There's nothing here">
		<p class="hint">
			This status link doesn't match any note. Either the link is wrong, or the note burned so long
			ago that its record has been deleted.
		</p>
	</StatusCard>
{:else if view.kind === 'found'}
	{@const note = view.note}
	<section class="card status-page" aria-labelledby="status-title">
		<div>
			<p class="eyebrow">Note status</p>
			<h1 id="status-title">
				{#if note.status === 'burned'}
					This note has burned
				{:else if note.opens.length > 0}
					Your note has been opened
				{:else}
					Your note hasn't been opened yet
				{/if}
			</h1>
		</div>

		{#if note.status === 'active'}
			<ul class="facts">
				<li><strong>{plural(note.viewsLeft, 'view', 'views')}</strong> left</li>
				<li>
					Expires <strong>{formatRelative(note.expiresAt)}</strong>
					<span class="hint">({formatDate(note.expiresAt)})</span>
				</li>
				{#if note.hasPassword}
					<li>Protected by a password</li>
				{/if}
			</ul>
		{:else}
			<p>
				Burned <strong>{formatDate(note.burnedAt)}</strong>. {burnedBecause[note.reason]}
			</p>
		{/if}

		{#if note.failedAttempts > 0}
			<p class="notice">
				{plural(note.failedAttempts, 'wrong password was', 'wrong passwords were')} entered.
			</p>
		{/if}

		<div class="opens">
			<h2>Opened</h2>
			{#if note.opens.length > 0}
				<ol>
					{#each note.opens as openedAt, i (i)}
						<li>{formatDate(openedAt)}</li>
					{/each}
				</ol>
			{:else}
				<p class="hint">{note.status === 'active' ? 'Not yet.' : 'Never.'}</p>
			{/if}
		</div>

		{#if actionError}
			<p class="error" role="alert">{actionError}</p>
		{/if}

		{#if note.status === 'active'}
			{#if confirming}
				<div class="confirm">
					<p>Burn the note now? Nobody will be able to open it, and this can't be undone.</p>
					<div class="actions">
						<button
							type="button"
							class="btn btn-danger"
							disabled={busy}
							onclick={() => act(() => burnNote(manageToken))}
						>
							Burn it for good
						</button>
						<button type="button" class="btn" onclick={() => (confirming = false)}>Cancel</button>
					</div>
				</div>
			{:else}
				<div class="actions">
					<button type="button" class="btn btn-danger" onclick={() => (confirming = true)}>
						Burn now
					</button>
					<button
						type="button"
						class="btn"
						disabled={busy}
						onclick={() => act(() => noteStatus(manageToken))}
					>
						Refresh
					</button>
				</div>
			{/if}
		{/if}

		<p class="hint">
			Times are rounded to the minute. Nothing about who opened the note is recorded.
		</p>
	</section>
{:else}
	<StatusCard title="Something went wrong">
		<p class="error" role="alert">{view.message}</p>
		<button type="button" class="btn" onclick={() => location.reload()}>Try again</button>
	</StatusCard>
{/if}

<style>
	code {
		font-family: var(--font-mono);
		color: var(--ember-text);
	}

	.status-page {
		display: grid;
		gap: 20px;
	}

	h1 {
		font-size: 26px;
		margin-top: 4px;
	}

	h2 {
		font-family: var(--font-sans);
		font-size: 15px;
		font-weight: 650;
	}

	.facts,
	.opens ol {
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

	.opens {
		display: grid;
		gap: 8px;
	}

	.opens ol {
		font-family: var(--font-mono);
		font-size: 14px;
	}

	.notice {
		border-left: 3px solid var(--danger);
		background: var(--danger-bg);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		padding: 10px 14px;
		font-size: 15px;
	}

	.confirm {
		display: grid;
		gap: 12px;
		padding: 16px;
		border: 1px solid var(--danger);
		border-radius: var(--radius-sm);
		background: var(--danger-bg);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.btn-danger {
		border-color: var(--danger);
		color: var(--danger);
	}

	.btn-danger:hover:not(:disabled) {
		border-color: var(--danger);
		background: var(--danger-bg);
	}
</style>
