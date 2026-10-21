// The display choices of the mode and CRT switches. They are kept in localStorage, written only
// after a click, and never sent anywhere. static/theme-init.js reads the same keys before the
// first paint.

export const THEME_KEY = 'emberslip.theme';
export const CRT_KEY = 'emberslip.crt';

export const themes = ['kanal', 'tageslicht'] as const;
export type Theme = (typeof themes)[number];

export function load(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

export function save(key: string, value: string) {
	try {
		localStorage.setItem(key, value);
	} catch {
		// Storage can be blocked; the choice then lasts until the page is closed.
	}
}

/** Shows a mode on the page, including the browser's theme colour. */
export function showTheme(theme: Theme) {
	const root = document.documentElement;
	if (theme === 'tageslicht') root.dataset.theme = theme;
	else delete root.dataset.theme;
	const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
	const color = meta?.dataset[theme];
	if (meta && color) meta.content = color;
}

/** Turns the CRT effect on or off. */
export function showCrt(on: boolean) {
	document.documentElement.classList.toggle('rt-crt-off', !on);
}

export function currentTheme(): Theme {
	return document.documentElement.dataset.theme === 'tageslicht' ? 'tageslicht' : 'kanal';
}

export function currentCrt(): boolean {
	return !document.documentElement.classList.contains('rt-crt-off');
}
