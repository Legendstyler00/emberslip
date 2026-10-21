<script lang="ts">
	import type { Snippet } from 'svelte';

	// Gouda, the gamer rat of ratte.lol, comments from the side. Purely decorative for screen
	// readers apart from the bubble text, so the bubble must never repeat a heading, a label or
	// a button text of the page.
	let {
		mood = 'frech',
		side = 'left',
		compact = false,
		children
	}: {
		mood?: 'frech' | 'zufrieden' | 'panik';
		side?: 'left' | 'right';
		compact?: boolean;
		children: Snippet;
	} = $props();
</script>

<figure class="rt-gouda rt-gouda--{side} rt-gouda--{mood}" class:rt-gouda--compact={compact}>
	<span class="rt-gouda-avatar">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="58 36 204 174"
			aria-hidden="true"
			focusable="false"
		>
			<circle
				cx="104"
				cy="88"
				r="33"
				fill="#a9a1b4"
				stroke="#141816"
				stroke-width="4.5"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
			<circle
				cx="216"
				cy="88"
				r="33"
				fill="#a9a1b4"
				stroke="#141816"
				stroke-width="4.5"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
			<circle cx="108" cy="93" r="19" fill="#ff9fd2" />
			<circle cx="212" cy="93" r="19" fill="#ff9fd2" />
			<path
				d="M160 76 C208 76 234 106 230 140 C226 170 196 202 160 204 C124 202 94 170 90 140 C86 106 112 76 160 76 Z"
				fill="#a9a1b4"
				stroke="#141816"
				stroke-width="4.5"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
			<path
				d="M104 150 C112 176 134 190 160 190 C186 190 208 176 216 150 C200 160 182 150 160 150 C138 150 120 160 104 150 Z"
				fill="#8c84a0"
				opacity=".35"
			/>
			<ellipse cx="160" cy="170" rx="35" ry="27" fill="#e4dee8" />
			<path
				d="M143 77 L141 52 L155 70 L163 40 L171 70 L186 52 L179 77 Z"
				fill="#a9a1b4"
				stroke="#141816"
				stroke-width="4.5"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
			<ellipse cx="121" cy="154" rx="10" ry="6" fill="#ff9fd2" opacity=".8" />
			<ellipse cx="199" cy="154" rx="10" ry="6" fill="#ff9fd2" opacity=".8" />
			<path
				d="M128 160 L88 150 M128 166 L84 168 M130 172 L92 186"
				stroke="#141816"
				stroke-width="2.5"
				stroke-linecap="round"
				fill="none"
			/>
			<path
				d="M192 160 L232 150 M192 166 L236 168 M190 172 L228 186"
				stroke="#141816"
				stroke-width="2.5"
				stroke-linecap="round"
				fill="none"
			/>
			{#if mood === 'panik'}
				<circle
					cx="133"
					cy="126"
					r="14"
					fill="#fff"
					stroke="#141816"
					stroke-width="4.5"
					stroke-linejoin="round"
					stroke-linecap="round"
				/>
				<circle cx="133" cy="127" r="4.5" fill="#141816" />
				<circle
					cx="187"
					cy="126"
					r="14"
					fill="#fff"
					stroke="#141816"
					stroke-width="4.5"
					stroke-linejoin="round"
					stroke-linecap="round"
				/>
				<circle cx="187" cy="127" r="4.5" fill="#141816" />
				<path
					d="M118 104 L144 110 M202 104 L176 110"
					fill="none"
					stroke="#141816"
					stroke-width="4.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			{:else if mood === 'zufrieden'}
				<path
					d="M122 133 Q133 120 144 133"
					fill="none"
					stroke="#141816"
					stroke-width="5"
					stroke-linecap="round"
				/>
				<path
					d="M176 133 Q187 120 198 133"
					fill="none"
					stroke="#141816"
					stroke-width="5"
					stroke-linecap="round"
				/>
			{:else}
				<ellipse cx="133" cy="128" rx="10.5" ry="13.5" fill="#141816" />
				<circle cx="136.5" cy="123" r="4.2" fill="#fff" />
				<circle cx="130" cy="133" r="1.8" fill="#fff" />
				<path
					d="M121 107 L144 101"
					fill="none"
					stroke="#141816"
					stroke-width="4.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<path
					d="M176 133 Q187 120 198 133"
					fill="none"
					stroke="#141816"
					stroke-width="5"
					stroke-linecap="round"
				/>
				<path
					d="M177 109 L198 112"
					fill="none"
					stroke="#141816"
					stroke-width="4.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			{/if}
			<ellipse
				cx="160"
				cy="152"
				rx="12"
				ry="8.5"
				fill="#ff4fd8"
				stroke="#141816"
				stroke-width="4.5"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
			<ellipse cx="156" cy="149" rx="3.5" ry="2" fill="#fff" opacity=".85" />
			{#if mood === 'panik'}
				<ellipse cx="160" cy="176" rx="11" ry="9" fill="#141816" />
				<rect
					x="152.5"
					y="166"
					width="15"
					height="12"
					rx="2.5"
					fill="#fff6dc"
					stroke="#141816"
					stroke-width="3"
				/>
				<path d="M160 166 L160 178" stroke="#141816" stroke-width="2.5" />
				<path
					d="M207 92 C201 104 201 112 207 116 C213 112 213 104 207 92 Z"
					fill="#4fe3ff"
					stroke="#141816"
					stroke-width="3"
					stroke-linejoin="round"
					stroke-linecap="round"
				/>
			{:else if mood === 'zufrieden'}
				<path
					d="M144 164 Q160 184 176 164 Z"
					fill="#141816"
					stroke="#141816"
					stroke-width="3.5"
					stroke-linejoin="round"
				/>
				<path d="M150 167 Q160 183 170 167 Z" fill="#ff4fd8" opacity=".9" />
				<rect
					x="152.5"
					y="164"
					width="15"
					height="12"
					rx="2.5"
					fill="#fff6dc"
					stroke="#141816"
					stroke-width="3"
				/>
				<path d="M160 164 L160 176" stroke="#141816" stroke-width="2.5" />
			{:else}
				<path
					d="M160 160 L160 166 M144 164 Q152 173 160 166 Q169 172 178 160"
					fill="none"
					stroke="#141816"
					stroke-width="4.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<rect
					x="152.5"
					y="167"
					width="15"
					height="12"
					rx="2.5"
					fill="#fff6dc"
					stroke="#141816"
					stroke-width="3"
				/>
				<path d="M160 167 L160 179" stroke="#141816" stroke-width="2.5" />
			{/if}
			<path
				d="M86 140 C82 46 238 46 234 140"
				fill="none"
				stroke="#141816"
				stroke-width="15"
				stroke-linecap="round"
			/>
			<path
				d="M86 140 C82 46 238 46 234 140"
				fill="none"
				stroke="#262c2b"
				stroke-width="8"
				stroke-linecap="round"
			/>
			<path
				d="M118 66 C146 54 174 54 202 66"
				fill="none"
				stroke="#7cf27c"
				stroke-width="3"
				stroke-linecap="round"
			/>
			<rect
				x="72"
				y="116"
				width="28"
				height="48"
				rx="11"
				fill="#262c2b"
				stroke="#141816"
				stroke-width="4.5"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
			<rect
				x="220"
				y="116"
				width="28"
				height="48"
				rx="11"
				fill="#262c2b"
				stroke="#141816"
				stroke-width="4.5"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
			<rect x="79" y="126" width="5" height="28" rx="2.5" fill="#7cf27c" />
			<rect x="236" y="126" width="5" height="28" rx="2.5" fill="#7cf27c" />
			<path
				d="M90 162 C94 184 108 190 126 186"
				fill="none"
				stroke="#141816"
				stroke-width="9"
				stroke-linecap="round"
			/>
			<path
				d="M90 162 C94 184 108 190 126 186"
				fill="none"
				stroke="#262c2b"
				stroke-width="4"
				stroke-linecap="round"
			/>
			<rect
				x="122"
				y="179"
				width="16"
				height="13"
				rx="6.5"
				fill="#3a4341"
				stroke="#141816"
				stroke-width="3.5"
			/>
			<circle cx="130" cy="185.5" r="2.6" fill="#7cf27c" />
		</svg>
	</span>
	<blockquote class="rt-gouda-bubble">
		<span class="rt-gouda-name label">Gouda</span>
		<div class="rt-gouda-text body-sm">{@render children()}</div>
	</blockquote>
</figure>
