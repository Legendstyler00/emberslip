<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import '@fontsource-variable/bricolage-grotesque/opsz.css';
	import '@fontsource-variable/martian-mono/wdth.css';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import DisplayControls from '#lib/components/DisplayControls.svelte';
	import Logo from '#lib/components/Logo.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// Reading pages get the softer CRT effect, as the legal pages on ratte.lol do.
	const soft = $derived(['/security', '/privacy', '/imprint'].includes(page.url.pathname));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<a class="rt-skip" href="#main">Skip to content</a>

<div class="rt-crt rt-crt--fixed shell" class:rt-crt--full={!soft} class:rt-crt--soft={soft}>
	<header class="rt-nav">
		<a class="rt-nav-brand" href={resolve('/')} aria-label="Emberslip">
			<Logo />
			<span>ember</span><span class="rt-nav-brand-dot">slip</span><span
				class="rt-nav-brand-cursor"
				aria-hidden="true"
			></span>
		</a>
		<nav class="rt-nav-links" aria-label="Main">
			<a
				class="rt-nav-link label"
				href={resolve('/')}
				aria-current={page.url.pathname === '/' ? 'page' : undefined}>New note</a
			>
			<a
				class="rt-nav-link label"
				href={resolve('/request')}
				aria-current={page.url.pathname === '/request' ? 'page' : undefined}>Request a secret</a
			>
		</nav>
		<div class="rt-nav-tools"><DisplayControls /></div>
	</header>

	<main id="main">
		<div class="rt-container">
			{@render children()}
		</div>
	</main>

	<footer class="rt-footer">
		<div class="rt-footer-inner rt-container">
			<p class="rt-footer-note">Notes are encrypted in your browser and burn after reading.</p>
			<nav class="rt-footer-links" aria-label="About">
				<a class="rt-footer-link" href={resolve('/security')}>How it works</a>
				<a class="rt-footer-link" href={resolve('/privacy')}>Privacy</a>
				<a class="rt-footer-link" href={resolve('/imprint')}>Imprint</a>
				<a class="rt-footer-link" href={data.sourceUrl} rel="external noopener">Source code</a>
			</nav>
		</div>
	</footer>

	<span class="rt-crt-fx" aria-hidden="true"></span>
</div>

<style>
	.shell {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		min-height: 100dvh;
	}

	/* The container sits inside main, because auto margins on a flex item would shrink it. */
	main {
		flex: 1 0 auto;
	}

	.rt-nav-brand :global(svg) {
		align-self: center;
		margin-right: var(--space-2);
	}

	.rt-nav-brand-cursor {
		margin-left: 1px;
	}
</style>
