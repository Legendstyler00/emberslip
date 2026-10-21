<script lang="ts">
	import { createSecretRequest } from '#lib/client/api.ts';
	import { formatDate, formatRelative } from '#lib/client/format.ts';
	import { errorMessage } from '#lib/client/fragment.ts';
	import { toBase64Url } from '#lib/crypto/bytes.ts';
	import { createRequest, MAX_REQUEST_MESSAGE_LENGTH } from '#lib/crypto/request.ts';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import Gouda from '#lib/components/Gouda.svelte';
	import LinkQr from '#lib/components/LinkQr.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import Terminal from '#lib/components/Terminal.svelte';

	const ttlOptions = [
		{ value: 3600, label: '1 hour' },
		{ value: 86400, label: '1 day' },
		{ value: 604800, label: '7 days' }
	];

	let message = $state('');
	let ttl = $state(86400);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let created = $state<{ shareLink: string; inboxLink: string; expiresAt: number } | null>(null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (busy) return;
		busy = true;
		error = null;
		try {
			const { shareSecret, seed, payload } = await createRequest(message.trim());
			const { expiresAt } = await createSecretRequest({ ...payload, ttl });
			created = {
				shareLink: new URL(`/r#${toBase64Url(shareSecret)}`, location.origin).href,
				inboxLink: new URL(`/inbox#${toBase64Url(seed)}`, location.origin).href,
				expiresAt
			};
			message = '';
		} catch (err) {
			error = errorMessage(err);
		} finally {
			busy = false;
		}
	}

	function selectAll(event: FocusEvent) {
		(event.currentTarget as HTMLInputElement).select();
	}
</script>

<svelte:head>
	<title>Request a secret · Emberslip</title>
</svelte:head>

<section class="rt-section">
	{#if created}
		<div class="rt-split rt-split--top">
			<section class="rt-panel result" aria-labelledby="result-title">
				<div class="rt-section-head">
					<p class="label kicker">Request created</p>
					<h1 id="result-title" class="h2">Two links, two jobs</h1>
				</div>

				<div class="link-block">
					<h2 class="h3">1. Send this link</h2>
					<p class="hint">
						Whoever opens it can send you one secret. It stays open until {formatDate(
							created.expiresAt
						)}
						({formatRelative(created.expiresAt)}).
					</p>
					<div class="link-row">
						<label class="visually-hidden" for="share-link">Link to send</label>
						<input
							id="share-link"
							class="input input--mono"
							readonly
							value={created.shareLink}
							onfocus={selectAll}
						/>
						<CopyButton text={created.shareLink} label="Copy link" primary />
					</div>
					<LinkQr link={created.shareLink} label="QR code of the link to send" />
				</div>

				<div class="link-block private">
					<h2 class="h3">2. Keep this one to yourself</h2>
					<p class="hint">
						Your private inbox. It's the only way to read the answer, and we can't recover it.
						Bookmark it or store it somewhere safe.
					</p>
					<div class="link-row">
						<label class="visually-hidden" for="inbox-link">Your private inbox link</label>
						<input
							id="inbox-link"
							class="input input--mono"
							readonly
							value={created.inboxLink}
							onfocus={selectAll}
						/>
						<CopyButton text={created.inboxLink} label="Copy" />
					</div>
				</div>

				<button
					type="button"
					class="rt-btn rt-btn--secondary rt-btn--md rt-btn--block"
					onclick={() => (created = null)}
				>
					Create another request
				</button>
			</section>
			<Gouda mood="zufrieden" side="right"
				>One link goes out, one stays home. Same as me and my cheese stash.</Gouda
			>
		</div>
	{:else}
		<div class="rt-split rt-split--top">
			<div class="page-stack">
				<div class="rt-section-head">
					<h1 class="h1">Ask someone for a secret.</h1>
					<p class="body-lg lead">
						Send a request link to whoever has the secret. They type it in, it's encrypted on their
						device, and only your browser can decrypt it, once.
					</p>
				</div>

				<form class="rt-panel form" onsubmit={submit}>
					<div>
						<label class="label field-label" for="message"
							>What do you need? <span class="optional">Optional</span></label
						>
						<textarea
							id="message"
							class="textarea textarea--plain"
							rows="3"
							maxlength={MAX_REQUEST_MESSAGE_LENGTH}
							placeholder="For example: the login for the shared analytics account"
							bind:value={message}></textarea>
						<p class="hint counter">
							Shown to the person you ask, encrypted like everything else. {message.length}/{MAX_REQUEST_MESSAGE_LENGTH}
						</p>
					</div>

					<Segmented
						legend="Request link stays open for"
						name="ttl"
						options={ttlOptions}
						bind:value={ttl}
					/>

					{#if error}
						<p class="error" role="alert">{error}</p>
					{/if}

					<div class="submit">
						<button
							type="submit"
							class="rt-btn rt-btn--primary rt-btn--md rt-btn--block rt-glitch"
							data-text="Create request"
							disabled={busy}
						>
							{#if busy}
								<span class="busy-cursor" aria-hidden="true"></span>
								Creating keys…
							{:else}
								Create request
							{/if}
						</button>
						<p class="hint">
							Answers are protected with X-Wing (ML-KEM-768 + X25519), a hybrid that stays secure
							even against future quantum computers.
						</p>
					</div>
				</form>
			</div>

			<div class="aside">
				<Terminal
					lines={[
						{ text: './emberslip --request' },
						{ kind: 'ok', text: 'key pair made in this browser' },
						{ kind: 'comment', text: 'only your inbox can open the answer' }
					]}
					cursor
				/>
				<Gouda mood="frech">Asking nicely works. I tried it with cheese once.</Gouda>
			</div>
		</div>
	{/if}
</section>

<style>
	.kicker {
		color: var(--slime);
	}

	.lead {
		color: var(--ink-muted);
		max-width: 52ch;
	}

	.form,
	.result {
		gap: var(--space-6);
	}

	.optional {
		margin-left: var(--space-2);
		color: var(--ink-muted);
		font-weight: 400;
	}

	.counter {
		margin-top: var(--space-2);
	}

	.submit {
		display: grid;
		gap: var(--space-3);
		text-align: center;
	}

	.link-block {
		display: grid;
		gap: var(--space-3);
	}

	/* The inbox link is only for the person asking: framed like Gouda's speech bubble. */
	.private {
		padding: var(--space-4);
		background: var(--surface-sunken);
		border: 2px solid var(--magenta);
		border-radius: var(--radius-md);
	}

	.private h2 {
		color: var(--magenta);
	}

	.link-row {
		display: flex;
		gap: var(--space-2);
	}

	.aside {
		display: grid;
		gap: var(--space-6);
		align-content: start;
	}

	.link-row .input {
		min-width: 0;
	}

	@media (width<=959.98px) {
		.link-row {
			flex-direction: column;
		}

		.aside {
			display: none;
		}
	}
</style>
