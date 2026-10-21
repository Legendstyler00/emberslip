<script lang="ts">
	import type { Snippet } from 'svelte';

	export interface TerminalLine {
		kind?: 'cmd' | 'ok' | 'err' | 'comment';
		text: string;
	}

	// The ratte.lol terminal. With `lines` it is a decorative screen, hidden from screen readers,
	// so its text must never repeat a heading, a label or a button text of the page. With
	// children it frames a form field, such as the textarea a secret is typed into.
	let {
		title = 'gouda@kanal: ~',
		lines = [],
		cursor = false,
		typing = false,
		children
	}: {
		title?: string;
		lines?: TerminalLine[];
		cursor?: boolean;
		typing?: boolean;
		children?: Snippet;
	} = $props();
</script>

{#snippet bar()}
	<span class="rt-term-title">{title}</span>
	<span class="rt-term-tty">tty1</span>
{/snippet}

{#if children}
	<div class="rt-term rt-term--field">
		<div class="rt-term-bar" aria-hidden="true">{@render bar()}</div>
		{@render children()}
	</div>
{:else}
	<figure class="rt-term" class:rt-term--typing={typing} aria-hidden="true">
		<figcaption class="rt-term-bar">{@render bar()}</figcaption>
		<pre class="rt-term-body code">{#each lines as line, i (i)}<span
					class="rt-term-line rt-term-line--{line.kind ?? 'cmd'}"
					>{#if (line.kind ?? 'cmd') === 'cmd'}<span class="rt-term-prompt">gouda@kanal:~$</span
						> {line.text}{:else if line.kind === 'ok'}<span class="rt-term-mark rt-term-mark--ok"
							>[ok]</span
						> {line.text}{:else if line.kind === 'err'}<span class="rt-term-mark rt-term-mark--err"
							>[!!]</span
						> {line.text}{:else}# {line.text}{/if}</span
				>{/each}{#if cursor}<span class="rt-term-line rt-term-line--cmd"
					><span class="rt-term-prompt">gouda@kanal:~$</span> <span class="rt-term-cursor"
					></span></span
				>{/if}</pre>
	</figure>
{/if}

<style>
	.rt-term {
		max-width: none;
	}

	.rt-term-line {
		display: block;
		min-height: 22px;
	}

	/* The field variant: the textarea is the screen, the frame lights up while typing. */
	.rt-term--field {
		transition:
			border-color 0.12s,
			box-shadow 0.12s;
	}

	.rt-term--field:focus-within {
		border-color: var(--slime);
		box-shadow: var(--glow-slime);
	}

	.rt-term--field :global(.textarea) {
		border: 0;
		box-shadow: none;
	}
</style>
