<script lang="ts">
	import { resolve } from '$app/paths';
	import '@fontsource-variable/bricolage-grotesque/opsz.css';
	import '@fontsource-variable/martian-mono/wdth.css';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import DisplayControls from '#lib/components/DisplayControls.svelte';
	import Logo from '#lib/components/Logo.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="shell">
	<header>
		<a class="brand" href={resolve('/')}>
			<Logo />
			<span>Emberslip</span>
		</a>
		<nav aria-label="Main">
			<a href={resolve('/')}>New note</a>
			<a href={resolve('/request')}>Request a secret</a>
		</nav>
		<div class="tools"><DisplayControls /></div>
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>Notes are encrypted in your browser and burn after reading.</p>
		<nav aria-label="About">
			<a href={resolve('/security')}>How it works</a>
			<a href={resolve('/privacy')}>Privacy</a>
			<a href={resolve('/imprint')}>Imprint</a>
			<a href={data.sourceUrl} rel="external noopener">Source code</a>
		</nav>
	</footer>
</div>

<style>
	.shell {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		max-width: 720px;
		margin: 0 auto;
		padding: 0 16px;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 22px 0;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: var(--text);
		font-family: var(--font-display);
		font-size: 21px;
		font-weight: 650;
		text-decoration: none;
	}

	nav {
		display: flex;
		gap: 18px;
	}

	nav a {
		color: var(--muted);
		font-size: 15px;
		font-weight: 550;
		text-decoration: none;
	}

	nav a:hover {
		color: var(--text);
	}

	main {
		flex: 1;
		padding: 20px 0 48px;
	}

	footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 12px 24px;
		border-top: 1px solid var(--border);
		padding: 22px 0 32px;
		color: var(--faint);
		font-size: 14px;
	}

	footer nav {
		gap: 16px;
		flex-wrap: wrap;
	}

	footer a {
		color: var(--muted);
		text-decoration: none;
	}

	footer a:hover {
		color: var(--text);
	}
</style>
