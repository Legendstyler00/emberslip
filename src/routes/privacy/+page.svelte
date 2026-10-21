<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Privacy · Emberslip</title>
</svelte:head>

<article class="rt-section info">
	<header class="rt-section-head page-measure">
		<h1 class="h1">Privacy</h1>
		<p class="body-lg lead">
			Emberslip is built to know as little as possible. There are no accounts, no cookies, no
			analytics, and nothing is loaded from other sites. Fonts are served from this server.
		</p>
	</header>
	<div class="rt-prose">
		<h2>What is stored</h2>
		<ul>
			<li>
				<strong>Encrypted notes and answers.</strong> They are encrypted in your browser with a key that
				never reaches the server, so the operator can't read them.
			</li>
			<li>
				<strong>Hashes of access tokens</strong>, the expiry time, the number of views left, and,
				for password-protected notes, the settings needed to check the password. Nothing that
				reveals the password itself.
			</li>
			<li>
				<strong>Open times, only if you ask for a status link.</strong> When a note was opened, rounded
				to the minute. No IP address, browser details, or anything else about the reader.
			</li>
			<li>
				<strong>A tombstone</strong> once something burns: when (rounded to the minute) and why. It is
				deleted after 30 days.
			</li>
		</ul>
		<p>
			Encrypted content is overwritten as soon as it has been read or has expired. Expired items are
			cleaned up every minute.
		</p>

		<h2>Stored in your browser</h2>
		<p>
			When you switch the mode (sewer or daylight) or the CRT effect, your browser remembers this
			choice in its local storage (localStorage, entries <code>emberslip.theme</code> and
			<code>emberslip.crt</code>). This only happens after you click. The entries contain no
			personal data and are not sent to the server. The legal basis is § 25 (2) no. 2 of the German
			Telecommunications Digital Services Data Protection Act (TDDDG): the storage is strictly
			necessary to keep the setting you chose. You can delete the entries at any time by clearing
			the site data of this instance in your browser.
		</p>

		<h2>IP addresses</h2>
		<p>
			To stop abuse, the number of requests per IP address is limited. For this, addresses are kept
			in memory only, as keyed hashes that change whenever the server restarts. The application
			doesn't write them to disk or log requests. The legal basis is the legitimate interest in
			keeping the service available (Art. 6(1)(f) GDPR).
		</p>

		<h2>Contact</h2>
		<p>
			This instance is run by the operator named in the <a href={resolve('/imprint')}>imprint</a>.
			Contact them for questions about privacy or this instance.
		</p>
	</div>
</article>

<style>
	.lead {
		color: var(--ink-muted);
	}
</style>
