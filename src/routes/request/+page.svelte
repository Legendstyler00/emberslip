<script lang="ts">
	import { createSecretRequest } from '#lib/client/api.ts';
	import { formatDate, formatRelative } from '#lib/client/format.ts';
	import { errorMessage } from '#lib/client/fragment.ts';
	import { toBase64Url } from '#lib/crypto/bytes.ts';
	import { createRequest, MAX_REQUEST_MESSAGE_LENGTH } from '#lib/crypto/request.ts';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import LinkQr from '#lib/components/LinkQr.svelte';
	import Segmented from '#lib/components/Segmented.svelte';

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

{#if created}
	<section class="card result" aria-labelledby="result-title">
		<div>
			<p class="eyebrow">Request created</p>
			<h1 id="result-title">Two links, two jobs</h1>
		</div>

		<div class="link-block">
			<h2>1. Send this link</h2>
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
					class="input link"
					readonly
					value={created.shareLink}
					onfocus={selectAll}
				/>
				<CopyButton text={created.shareLink} label="Copy link" />
			</div>
			<LinkQr link={created.shareLink} label="QR code of the link to send" />
		</div>

		<div class="link-block private">
			<h2>2. Keep this one to yourself</h2>
			<p class="hint">
				Your private inbox. It's the only way to read the answer, and we can't recover it. Bookmark
				it or store it somewhere safe.
			</p>
			<div class="link-row">
				<label class="visually-hidden" for="inbox-link">Your private inbox link</label>
				<input
					id="inbox-link"
					class="input link"
					readonly
					value={created.inboxLink}
					onfocus={selectAll}
				/>
				<CopyButton text={created.inboxLink} label="Copy" />
			</div>
		</div>

		<button type="button" class="btn btn-block" onclick={() => (created = null)}>
			Create another request
		</button>
	</section>
{:else}
	<section class="intro">
		<h1>Ask someone for a secret.</h1>
		<p>
			Send a request link to whoever has the secret. They type it in, it's encrypted on their
			device, and only your browser can decrypt it, once.
		</p>
	</section>

	<form class="card form" onsubmit={submit}>
		<div>
			<label class="label" for="message"
				>What do you need? <span class="optional">Optional</span></label
			>
			<textarea
				id="message"
				class="textarea message"
				rows="3"
				maxlength={MAX_REQUEST_MESSAGE_LENGTH}
				placeholder="For example: the login for the shared analytics account"
				bind:value={message}></textarea>
			<p class="hint">
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

		<button type="submit" class="btn btn-primary btn-block" disabled={busy}>
			{#if busy}
				<span class="spinner" aria-hidden="true"></span>
				Creating keys…
			{:else}
				Create request
			{/if}
		</button>
		<p class="hint center">
			Answers are protected with X-Wing (ML-KEM-768 + X25519), a hybrid that stays secure even
			against future quantum computers.
		</p>
	</form>
{/if}

<style>
	.intro {
		display: grid;
		gap: 14px;
		margin: 12px 0 28px;
	}

	.intro h1 {
		font-size: clamp(32px, 6vw, 46px);
		max-width: 16ch;
	}

	.intro p {
		color: var(--muted);
		font-size: 17px;
		max-width: 56ch;
	}

	.form,
	.result {
		display: grid;
		gap: 22px;
	}

	.message {
		font-family: var(--font-sans);
		font-size: 15px;
	}

	.optional {
		color: var(--faint);
		font-weight: 500;
	}

	.center {
		text-align: center;
	}

	.result h1 {
		font-size: 28px;
		margin-top: 4px;
	}

	.link-block {
		display: grid;
		gap: 10px;
		padding: 18px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface-2);
	}

	.link-block.private {
		border-color: rgb(255 122 47 / 0.45);
	}

	h2 {
		font-family: var(--font-sans);
		font-size: 16px;
		font-weight: 650;
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
</style>
