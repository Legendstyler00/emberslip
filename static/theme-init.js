// Runs blocking in <head>, before the first paint: applies the saved display mode, decides
// whether the CRT effect runs, and adds rt-js so the switches appear. Without JavaScript the
// page stays in the dark "kanal" mode with CRT off and without switches. It is a file rather
// than an inline script because the Content-Security-Policy allows no inline scripts. The keys
// are the same as in src/lib/client/display.ts.
(() => {
	const root = document.documentElement;
	let theme = null;
	let crt = null;
	try {
		theme = localStorage.getItem('emberslip.theme');
		crt = localStorage.getItem('emberslip.crt');
	} catch {
		// Storage can be blocked; keep the defaults.
	}
	if (theme === 'tageslicht') {
		root.setAttribute('data-theme', theme);
		const meta = document.querySelector('meta[name="theme-color"]');
		if (meta) meta.setAttribute('content', meta.getAttribute('data-tageslicht'));
	}
	// CRT runs unless switched off, or, without a choice, unless reduced motion is wanted.
	const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	const on = crt === 'on' || (crt !== 'off' && !reduce);
	root.classList.toggle('rt-crt-off', !on);
	root.classList.add('rt-js');
})();
