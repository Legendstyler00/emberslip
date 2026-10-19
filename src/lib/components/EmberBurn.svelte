<!-- Decorative embers rising off the edge of a burned note. -->
<div class="embers" aria-hidden="true">
	{#each { length: 18 }}
		<span></span>
	{/each}
</div>

<style>
	.embers {
		position: absolute;
		inset: auto 0 100% 0;
		height: 120px;
		pointer-events: none;
		overflow: visible;
	}

	span {
		position: absolute;
		bottom: -6px;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--ember-2);
		box-shadow:
			0 0 6px 2px var(--ember),
			0 0 14px 4px rgb(255 122 47 / 0.35);
		opacity: 0;
		animation: rise 2.6s ease-out forwards;
	}

	@keyframes rise {
		0% {
			opacity: 0;
			transform: translate(0, 0) scale(1);
		}
		12% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(var(--drift), -110px) scale(0.3);
		}
	}

	span:nth-child(1) {
		left: 4%;
		--drift: -10px;
		animation-delay: 0.05s;
	}
	span:nth-child(2) {
		left: 9%;
		--drift: 12px;
		animation-delay: 0.35s;
	}
	span:nth-child(3) {
		left: 15%;
		--drift: -6px;
		animation-delay: 0.15s;
	}
	span:nth-child(4) {
		left: 21%;
		--drift: 16px;
		animation-delay: 0.55s;
	}
	span:nth-child(5) {
		left: 27%;
		--drift: -14px;
		animation-delay: 0.25s;
	}
	span:nth-child(6) {
		left: 33%;
		--drift: 8px;
		animation-delay: 0.7s;
	}
	span:nth-child(7) {
		left: 39%;
		--drift: -4px;
		animation-delay: 0.1s;
	}
	span:nth-child(8) {
		left: 45%;
		--drift: 14px;
		animation-delay: 0.45s;
	}
	span:nth-child(9) {
		left: 51%;
		--drift: -12px;
		animation-delay: 0.2s;
	}
	span:nth-child(10) {
		left: 57%;
		--drift: 6px;
		animation-delay: 0.6s;
	}
	span:nth-child(11) {
		left: 63%;
		--drift: -16px;
		animation-delay: 0.3s;
	}
	span:nth-child(12) {
		left: 69%;
		--drift: 10px;
		animation-delay: 0.05s;
	}
	span:nth-child(13) {
		left: 75%;
		--drift: -8px;
		animation-delay: 0.5s;
	}
	span:nth-child(14) {
		left: 81%;
		--drift: 12px;
		animation-delay: 0.2s;
	}
	span:nth-child(15) {
		left: 86%;
		--drift: -6px;
		animation-delay: 0.65s;
	}
	span:nth-child(16) {
		left: 91%;
		--drift: 8px;
		animation-delay: 0.4s;
	}
	span:nth-child(17) {
		left: 96%;
		--drift: -12px;
		animation-delay: 0.15s;
	}
	span:nth-child(18) {
		left: 48%;
		--drift: 4px;
		animation-delay: 0.85s;
	}

	span:nth-child(3n) {
		width: 3px;
		height: 3px;
		animation-duration: 2.1s;
	}

	span:nth-child(4n) {
		animation-duration: 3s;
	}

	@media (prefers-reduced-motion: reduce) {
		span {
			display: none;
		}
	}
</style>
