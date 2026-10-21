<script lang="ts">
	import { onMount } from 'svelte';
	import { burnNote, noteStatus, type BurnReason, type ManageResponse } from '#lib/client/api.ts';
	import { formatDate, formatRelative, plural } from '#lib/client/format.ts';
	import { errorMessage, watchFragment } from '#lib/client/fragment.ts';
	import type { Bytes } from '#lib/crypto/bytes.ts';
	import { deriveManageToken, parseNoteKey } from '#lib/crypto/note.ts';
	import Gouda from '#lib/components/Gouda.svelte';
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

<section class="rt-section">
	<div class="rt-split rt-split--top">
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
			<Gouda mood="panik">Half a link is like half a cheese. Nobody wants that.</Gouda>
		{:else if view.kind === 'missing'}
			<StatusCard title="There's nothing here">
				<p class="hint">
					This status link doesn't match any note. Either the link is wrong, or the note burned so
					long ago that its record has been deleted.
				</p>
			</StatusCard>
			<Gouda mood="panik">I swear it was here a second ago!</Gouda>
		{:else if view.kind === 'found'}
			{@const note = view.note}
			<section class="rt-panel status-page" aria-labelledby="status-title">
				<div class="rt-section-head">
					<div class="kicker-row">
						<p class="label kicker">Note status</p>
						{#if note.status === 'burned'}
							<span class="rt-badge rt-badge--offline"
								><span class="rt-badge-glyph" aria-hidden="true"></span>Ash</span
							>
						{:else}
							<span class="rt-badge rt-badge--live"
								><span class="rt-badge-glyph" aria-hidden="true"></span>Live</span
							>
						{/if}
					</div>
					<h1 id="status-title" class="h2">
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
					<ul class="rt-facts">
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
					<p class="notice notice--alarm">
						{plural(note.failedAttempts, 'wrong password was', 'wrong passwords were')} entered.
					</p>
				{/if}

				<div class="opens">
					<h2 class="label">Opened</h2>
					<div class="opens-log">
						{#if note.opens.length > 0}
							<ol>
								{#each note.opens as openedAt, i (i)}
									<li>{formatDate(openedAt)}</li>
								{/each}
							</ol>
						{:else}
							<p>{note.status === 'active' ? 'Not yet.' : 'Never.'}</p>
						{/if}
					</div>
				</div>

				{#if actionError}
					<p class="error" role="alert">{actionError}</p>
				{/if}

				{#if note.status === 'active'}
					{#if confirming}
						<div class="confirm">
							<p>Burn the note now? Nobody will be able to open it, and this can't be undone.</p>
							<div class="page-actions">
								<button
									type="button"
									class="rt-btn rt-btn--alarm rt-btn--filled rt-btn--md"
									disabled={busy}
									onclick={() => act(() => burnNote(manageToken))}
								>
									Burn it for good
								</button>
								<button
									type="button"
									class="rt-btn rt-btn--secondary rt-btn--md"
									onclick={() => (confirming = false)}>Cancel</button
								>
							</div>
						</div>
					{:else}
						<div class="page-actions">
							<button
								type="button"
								class="rt-btn rt-btn--alarm rt-btn--md"
								onclick={() => (confirming = true)}
							>
								Burn now
							</button>
							<button
								type="button"
								class="rt-btn rt-btn--secondary rt-btn--md"
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
			{#if note.status === 'burned'}
				<Gouda mood="zufrieden">Ashes to ashes. Nothing left to nibble.</Gouda>
			{:else if confirming}
				<Gouda mood="panik">Torching it? No take-backs!</Gouda>
			{:else}
				<Gouda mood="frech">I'm keeping an eye on it. Nobody gets past my whiskers unnoticed.</Gouda
				>
			{/if}
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
</section>

<style>
	.status-page {
		gap: var(--space-6);
	}

	.kicker-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.kicker {
		color: var(--slime);
	}

	.opens {
		display: grid;
		gap: var(--space-2);
	}

	/* A small label, too small for the CRT colour split of the big headings. */
	.opens h2 {
		text-shadow: none;
	}

	/* The open times as a log on the terminal screen. */
	.opens-log {
		padding: var(--space-3) var(--space-4);
		background: var(--screen);
		border: 1px solid var(--screen-line);
		color: var(--screen-ink);
		font: var(--type-code);
	}

	.opens-log ol {
		display: grid;
		gap: var(--space-1);
		margin: 0;
		padding-left: var(--space-6);
	}

	.opens-log li::marker {
		color: var(--screen-prompt);
	}

	.opens-log p {
		color: var(--screen-muted);
	}

	.confirm {
		display: grid;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--alarm-soft);
		border: 2px solid var(--alarm);
		border-radius: var(--radius-md);
	}
</style>
