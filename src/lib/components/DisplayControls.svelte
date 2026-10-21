<script lang="ts">
	import { onMount } from 'svelte';
	import {
		CRT_KEY,
		THEME_KEY,
		currentCrt,
		currentTheme,
		load,
		save,
		showCrt,
		showTheme,
		type Theme
	} from '#lib/client/display.ts';

	// The server renders the defaults. Until this component mounts, the switches look right
	// anyway, because their pressed look follows the attributes theme-init.js put on <html>.
	let theme = $state<Theme>('kanal');
	let crt = $state(true);

	onMount(() => {
		theme = currentTheme();
		crt = currentCrt();

		// Without a saved choice, CRT follows a change of prefers-reduced-motion.
		const motion = matchMedia('(prefers-reduced-motion: reduce)');
		const follow = () => {
			if (load(CRT_KEY) === null) {
				crt = !motion.matches;
				showCrt(crt);
			}
		};
		motion.addEventListener('change', follow);
		return () => motion.removeEventListener('change', follow);
	});

	function pick(next: Theme) {
		theme = next;
		showTheme(next);
		save(THEME_KEY, next);
	}

	function toggleCrt() {
		crt = !crt;
		showCrt(crt);
		save(CRT_KEY, crt ? 'on' : 'off');
	}
</script>

<div class="rt-seg rt-js-only" role="group" aria-label="Mode">
	<button
		type="button"
		class="rt-seg-btn"
		data-mode="kanal"
		aria-pressed={theme === 'kanal'}
		onclick={() => pick('kanal')}>Sewer</button
	>
	<button
		type="button"
		class="rt-seg-btn"
		data-mode="tageslicht"
		aria-pressed={theme === 'tageslicht'}
		onclick={() => pick('tageslicht')}>Daylight</button
	>
</div>
<button
	type="button"
	role="switch"
	aria-checked={crt}
	class="rt-switch rt-switch--crt rt-js-only"
	title="CRT effect"
	onclick={toggleCrt}
>
	<span class="rt-switch-track" aria-hidden="true"><span class="rt-switch-thumb"></span></span>
	<span class="label">CRT</span>
</button>

<style>
	/* The pressed look follows <html>, which is right before the first paint, so the switches
	   never flash the server's defaults. */
	:global(html:not([data-theme='tageslicht'])) [data-mode='kanal'],
	:global(html[data-theme='tageslicht']) [data-mode='tageslicht'] {
		background: var(--slime);
		color: var(--on-slime);
	}

	:global(html[data-theme='tageslicht']) [data-mode='kanal'] {
		background: none;
		color: var(--ink-muted);
	}

	:global(html:not(.rt-crt-off)) .rt-switch--crt {
		color: var(--ink);
	}

	:global(html:not(.rt-crt-off)) .rt-switch--crt .rt-switch-track {
		background: var(--magenta-soft);
		border-color: var(--magenta);
	}

	:global(html:not(.rt-crt-off)) .rt-switch--crt .rt-switch-thumb {
		background: var(--magenta);
		transform: translate(14px);
	}

	:global(html.rt-crt-off) .rt-switch--crt {
		color: var(--ink-muted);
	}

	:global(html.rt-crt-off) .rt-switch--crt .rt-switch-track {
		background: var(--surface-sunken);
		border-color: var(--line-strong);
	}

	:global(html.rt-crt-off) .rt-switch--crt .rt-switch-thumb {
		background: var(--ink-muted);
		transform: none;
	}
</style>
