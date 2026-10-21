<script lang="ts">
	let { size = 18 }: { size?: number } = $props();
</script>

<!-- A pixel flame in the colours of ratte.lol. -->
<svg width={size} height={size} viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
	<path
		class="flame"
		d="M8 0h1v1h-1zM7 1h2v1h-2zM7 2h3v1h-3zM6 3h4v1h-4zM6 4h5v1h-5zM5 5h6v1h-6zM13 5h1v1h-1zM5 6h7v1h-7zM13 6h1v1h-1zM4 7h10v1h-10zM3 8h11v1h-11zM3 9h12v1h-12zM2 10h13v1h-13zM2 11h13v1h-13zM2 12h13v1h-13zM3 13h11v1h-11zM4 14h9v1h-9zM6 15h5v1h-5z"
	/>
	<path
		class="core"
		d="M8 8h1v1h-1zM7 9h2v1h-2zM7 10h3v1h-3zM6 11h4v1h-4zM6 12h5v1h-5zM6 13h5v1h-5zM7 14h3v1h-3z"
	/>
</svg>

<style>
	svg {
		flex: none;
		display: block;
	}

	.flame {
		fill: var(--alarm);
	}

	.core {
		fill: var(--cheese);
	}
</style>
