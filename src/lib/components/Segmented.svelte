<script lang="ts" generics="T extends string | number">
	let {
		legend,
		name,
		options,
		value = $bindable()
	}: {
		legend: string;
		name: string;
		options: { value: T; label: string }[];
		value: T;
	} = $props();
</script>

<fieldset>
	<legend class="label">{legend}</legend>
	<div class="options">
		{#each options as option (option.value)}
			<label class:selected={option.value === value}>
				<input type="radio" {name} value={option.value} bind:group={value} />
				{option.label}
			</label>
		{/each}
	</div>
</fieldset>

<style>
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		min-width: 0;
	}

	.options {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	label {
		position: relative;
		display: inline-flex;
		align-items: center;
		min-height: 38px;
		padding: 0 13px;
		border: 1px solid var(--border-strong);
		border-radius: 999px;
		color: var(--muted);
		font-size: 14px;
		font-weight: 550;
		cursor: pointer;
		transition:
			color 0.15s,
			border-color 0.15s,
			background 0.15s;
	}

	label:hover {
		color: var(--text);
	}

	label.selected {
		color: var(--text);
		border-color: var(--ember);
		background: rgb(255 122 47 / 0.12);
	}

	label:has(input:focus-visible) {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}

	input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
</style>
