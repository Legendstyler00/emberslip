<svelte:head>
	<title>How it works · Emberslip</title>
</svelte:head>

<article class="card prose">
	<h1>How Emberslip keeps your secrets</h1>
	<p class="lead">
		Everything is encrypted in your browser. The server stores ciphertext it can't read and deletes
		it as soon as a note has been read or has expired.
	</p>

	<h2>Sending a note</h2>
	<ol>
		<li>
			Your browser creates a random 256-bit key. It becomes the part of the link after the
			<code>#</code>. Browsers never send that part to a server, and it doesn't show up in server
			logs.
		</li>
		<li>
			The note is padded to a standard size, so its length stays hidden, and then encrypted with
			AES-256-GCM.
		</li>
		<li>
			The server gets the ciphertext and a token derived from the key, and stores only a hash of
			that token. Only someone with the full link can find the note again.
		</li>
		<li>
			Opening the link does nothing until the reader clicks <em>Reveal</em>. Link previews in chat
			apps therefore don't use up a view. When the last view is used up, the server overwrites the
			ciphertext.
		</li>
	</ol>

	<h2>Passwords</h2>
	<p>
		With a password, the key is also derived from the password (PBKDF2-SHA256, 600,000 iterations).
		The server checks a token derived from both before it releases anything, so someone with only
		the link can't download the note to guess the password offline. After five wrong attempts the
		note burns.
	</p>

	<h2>Requesting a secret</h2>
	<p>
		Requests use the post-quantum hybrid key exchange X-Wing, which combines ML-KEM-768 with X25519.
		To read an answer, an attacker would have to break both, so recording traffic today in the hope
		of decrypting it with a future quantum computer doesn't work. The request link carries a secret
		that protects your public key and message, and your private inbox link carries the seed for your
		key pair. Neither ever reaches the server.
	</p>

	<h2>Burned notes</h2>
	<p>
		After a note burns, the server keeps only the time (rounded to the minute) and the reason for 30
		days. If you open a link and see that it has already been read but you didn't read it, someone
		else had the link.
	</p>

	<h2>What Emberslip can't protect against</h2>
	<ul>
		<li>Malware or someone looking over your shoulder on either device.</li>
		<li>The recipient copying the secret and sharing it further.</li>
		<li>
			Someone intercepting the link before the recipient opens it. You will see that it happened,
			but you can't undo it. Use a password and send it through a different channel.
		</li>
		<li>
			A compromised server that delivers modified code to your browser. The code is open source, so
			you can run your own instance if you'd rather not trust this one.
		</li>
	</ul>
</article>

<style>
	.lead {
		font-size: 18px;
		color: var(--muted);
	}
</style>
