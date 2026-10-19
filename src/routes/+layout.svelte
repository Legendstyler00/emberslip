<script lang="ts">
	import { resolve } from '$app/paths';
	import '@fontsource-variable/inter';
	import '@fontsource-variable/fraunces';
	import '@fontsource-variable/jetbrains-mono';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import Logo from '#lib/components/Logo.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#13100e" />
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
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>Notes are encrypted in your browser and burn after reading.</p>
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
		border-top: 1px solid var(--border);
		padding: 22px 0 32px;
		color: var(--faint);
		font-size: 14px;
	}
</style>
