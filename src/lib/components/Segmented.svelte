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
	<legend class="label field-label">{legend}</legend>
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

	/* The ratte.lol segmented control, with native radios underneath. */
	.options {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 2px;
		padding: 2px;
		background: var(--surface-sunken);
		border: 1px solid var(--line-strong);
		border-radius: var(--radius-sm);
	}

	label {
		position: relative;
		display: inline-flex;
		align-items: center;
		min-height: 36px;
		padding: 0 var(--space-3);
		border-radius: 2px;
		color: var(--ink-muted);
		font: var(--type-label);
		letter-spacing: var(--type-label-tracking);
		text-transform: uppercase;
		cursor: pointer;
	}

	label:hover {
		color: var(--ink);
	}

	label.selected {
		background: var(--slime);
		color: var(--on-slime);
	}

	label:has(input:focus-visible) {
		box-shadow: var(--focus-ring);
	}

	input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
</style>
