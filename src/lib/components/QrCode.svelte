<script lang="ts">
	import { encodeQr } from '../client/qr';

	let { text, label }: { text: string; label: string } = $props();

	const QUIET_ZONE = 4;

	let qr = $derived.by(() => {
		const matrix = encodeQr(text);
		// One rectangle per horizontal run of dark modules keeps the path short.
		let path = '';
		matrix.forEach((row, y) => {
			let x = 0;
			while (x < row.length) {
				if (!row[x]) {
					x++;
					continue;
				}
				const start = x;
				while (x < row.length && row[x]) x++;
				path += `M${start + QUIET_ZONE} ${y + QUIET_ZONE}h${x - start}v1h${start - x}z`;
			}
		});
		return { size: matrix.length + QUIET_ZONE * 2, path };
	});
</script>

<svg
	class="qr"
	viewBox="0 0 {qr.size} {qr.size}"
	role="img"
	aria-label={label}
	shape-rendering="crispEdges"
>
	<path d={qr.path} />
</svg>

<style>
	/* Scanners expect dark modules on a light background, whatever the theme. */
	.qr {
		display: block;
		width: 100%;
		max-width: 240px;
		height: auto;
		background: #fff;
		fill: #000;
		border-radius: var(--radius-sm);
		box-shadow: 0 0 0 1px var(--border);
	}
</style>
