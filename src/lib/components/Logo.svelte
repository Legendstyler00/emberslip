<script lang="ts">
	let { size = 28, lit = true }: { size?: number; lit?: boolean } = $props();
	const uid = $props.id();
	const id = `flame-${uid}`;
</script>

<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
	<defs>
		<linearGradient {id} x1="0" y1="1" x2="0" y2="0">
			<stop offset="0" stop-color={lit ? '#ff6a1f' : '#6f6964'} />
			<stop offset="1" stop-color={lit ? '#ffc35a' : '#a19a94'} />
		</linearGradient>
	</defs>
	<path
		fill="url(#{id})"
		d="M16 3c.9 4.4 3.6 6.6 5.8 9 2.1 2.3 3.6 4.7 3.6 7.9 0 5.2-4.2 9.4-9.4 9.4s-9.4-4.2-9.4-9.4c0-3.1 1.3-5.5 3.3-7.3.3 2.1 1.4 3.5 3 4.3-.5-4.8 1.2-9.4 3.1-13.9z"
	/>
	<path
		class="core"
		d="M16 17c.6 1.9 1.9 2.9 2.7 4 .7.9 1.1 1.8 1.1 2.9a3.8 3.8 0 0 1-7.6 0c0-2.2 1.4-3.9 3.8-6.9z"
	/>
</svg>

<style>
	svg {
		flex: none;
		display: block;
	}

	.core {
		fill: var(--bg);
		opacity: 0.55;
	}
</style>
