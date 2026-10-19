// QR code encoder (ISO/IEC 18004) for byte-mode text at error correction level M.
// The links it encodes carry decryption keys, so this is kept in-house rather than pulled in
// as a dependency.

/** Error correction codewords per block at level M, indexed by version. */
const ECC_PER_BLOCK = [
	0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28,
	28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28
];

/** Number of error correction blocks at level M, indexed by version. */
const BLOCKS = [
	0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25,
	26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49
];

const MAX_VERSION = 40;
// Format information bits for level M.
const ECL_BITS = 0b00;

/** A square matrix of modules, `true` for dark. Rows first, without the quiet zone. */
export type QrMatrix = boolean[][];

/** Encodes text as the smallest QR code that holds it. */
export function encodeQr(text: string): QrMatrix {
	const bytes = new TextEncoder().encode(text);
	const version = pickVersion(bytes.length);
	const codewords = addErrorCorrection(dataCodewords(bytes, version), version);

	const grid = new Grid(version);
	grid.placeData(codewords);

	let best: QrMatrix | undefined;
	let bestScore = Infinity;
	for (let mask = 0; mask < 8; mask++) {
		const candidate = grid.render(mask);
		const score = penalty(candidate);
		if (score < bestScore) {
			best = candidate;
			bestScore = score;
		}
	}
	return best!;
}

function pickVersion(byteLength: number): number {
	for (let version = 1; version <= MAX_VERSION; version++) {
		const bits = 4 + countBits(version) + byteLength * 8;
		if (bits <= dataCapacity(version) * 8) return version;
	}
	throw new RangeError('Text is too long for a QR code');
}

function countBits(version: number): number {
	return version < 10 ? 8 : 16;
}

/** Modules left for data and error correction after all function patterns are drawn. */
export function rawDataModules(version: number): number {
	const size = version * 4 + 17;
	let modules = size * size;
	modules -= 3 * 8 * 8; // finder patterns with separators
	modules -= 2 * (size - 16); // timing patterns
	modules -= 31; // format information and the dark module
	if (version >= 2) {
		const n = Math.floor(version / 7) + 2;
		modules -= (n * n - 3) * 25; // alignment patterns
		modules += 2 * (n - 2) * 5; // ...minus where they overlap the timing patterns
	}
	if (version >= 7) modules -= 2 * 18; // version information
	return modules;
}

function totalCodewords(version: number): number {
	return Math.floor(rawDataModules(version) / 8);
}

export function dataCapacity(version: number): number {
	return totalCodewords(version) - ECC_PER_BLOCK[version] * BLOCKS[version];
}

function dataCodewords(bytes: Uint8Array, version: number): Uint8Array {
	const capacity = dataCapacity(version);
	const bits: number[] = [];
	const push = (value: number, length: number) => {
		for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
	};

	push(0b0100, 4); // byte mode
	push(bytes.length, countBits(version));
	for (const byte of bytes) push(byte, 8);
	push(0, Math.min(4, capacity * 8 - bits.length)); // terminator
	push(0, (8 - (bits.length % 8)) % 8);

	const out = new Uint8Array(capacity);
	let i = 0;
	for (; i < bits.length / 8; i++) {
		for (let j = 0; j < 8; j++) out[i] = (out[i] << 1) | bits[i * 8 + j];
	}
	for (let pad = 0xec; i < capacity; i++, pad ^= 0xec ^ 0x11) out[i] = pad;
	return out;
}

/** Splits data into blocks, appends Reed-Solomon codewords and interleaves the result. */
function addErrorCorrection(data: Uint8Array, version: number): Uint8Array {
	const blockCount = BLOCKS[version];
	const eccLength = ECC_PER_BLOCK[version];
	const total = totalCodewords(version);
	const shortBlocks = blockCount - (total % blockCount);
	const shortLength = Math.floor(total / blockCount) - eccLength;
	const generator = rsGenerator(eccLength);

	const blocks: Uint8Array[] = [];
	const eccs: Uint8Array[] = [];
	for (let b = 0, offset = 0; b < blockCount; b++) {
		const length = shortLength + (b < shortBlocks ? 0 : 1);
		const block = data.subarray(offset, offset + length);
		blocks.push(block);
		eccs.push(rsRemainder(block, generator));
		offset += length;
	}

	const out: number[] = [];
	for (let i = 0; i <= shortLength; i++) {
		for (const block of blocks) if (i < block.length) out.push(block[i]);
	}
	for (let i = 0; i < eccLength; i++) {
		for (const ecc of eccs) out.push(ecc[i]);
	}
	return Uint8Array.from(out);
}

// Arithmetic in GF(256) with the QR code polynomial x^8 + x^4 + x^3 + x^2 + 1.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
	EXP[i] = EXP[i + 255] = x;
	LOG[x] = i;
	x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
}

function gfMul(a: number, b: number): number {
	return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
}

/** Coefficients of (x - a^0)(x - a^1)...(x - a^(degree-1)), highest power first. */
function rsGenerator(degree: number): Uint8Array {
	let poly = [1];
	for (let i = 0; i < degree; i++) {
		const next = new Array<number>(poly.length + 1).fill(0);
		for (let j = 0; j < poly.length; j++) {
			next[j] ^= poly[j];
			next[j + 1] ^= gfMul(poly[j], EXP[i]);
		}
		poly = next;
	}
	return Uint8Array.from(poly);
}

export function rsRemainder(data: Uint8Array, generator: Uint8Array): Uint8Array {
	const degree = generator.length - 1;
	const rem = new Uint8Array(degree);
	for (const byte of data) {
		const factor = byte ^ rem[0];
		rem.copyWithin(0, 1);
		rem[degree - 1] = 0;
		for (let i = 0; i < degree; i++) rem[i] ^= gfMul(generator[i + 1], factor);
	}
	return rem;
}

export function rsEcc(data: Uint8Array, degree: number): Uint8Array {
	return rsRemainder(data, rsGenerator(degree));
}

/** The 15 format information bits for level M and the given mask, BCH-coded and masked. */
export function formatBits(mask: number): number {
	const data = (ECL_BITS << 3) | mask;
	let rem = data;
	for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
	return ((data << 10) | rem) ^ 0x5412;
}

/** The 18 version information bits, BCH-coded. */
export function versionBits(version: number): number {
	let rem = version;
	for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
	return (version << 12) | rem;
}

export function alignmentPositions(version: number): number[] {
	if (version === 1) return [];
	const size = version * 4 + 17;
	const count = Math.floor(version / 7) + 2;
	const step = Math.floor((version * 8 + count * 3 + 5) / (count * 4 - 4)) * 2;
	const positions = [6];
	for (let pos = size - 7; positions.length < count; pos -= step) positions.splice(1, 0, pos);
	return positions;
}

const MASKS: ((x: number, y: number) => boolean)[] = [
	(x, y) => (x + y) % 2 === 0,
	(_, y) => y % 2 === 0,
	(x) => x % 3 === 0,
	(x, y) => (x + y) % 3 === 0,
	(x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
	(x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
	(x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
	(x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
];

class Grid {
	readonly size: number;
	readonly version: number;
	readonly dark: boolean[][];
	/** Modules that belong to a function pattern and are never masked. */
	readonly reserved: boolean[][];

	constructor(version: number) {
		this.version = version;
		this.size = version * 4 + 17;
		this.dark = Array.from({ length: this.size }, () => Array<boolean>(this.size).fill(false));
		this.reserved = Array.from({ length: this.size }, () => Array<boolean>(this.size).fill(false));
		this.drawFunctionPatterns();
	}

	private set(x: number, y: number, dark: boolean) {
		this.dark[y][x] = dark;
		this.reserved[y][x] = true;
	}

	private drawFunctionPatterns() {
		const { size } = this;
		for (let i = 0; i < size; i++) {
			this.set(6, i, i % 2 === 0);
			this.set(i, 6, i % 2 === 0);
		}

		for (const [cx, cy] of [
			[3, 3],
			[size - 4, 3],
			[3, size - 4]
		]) {
			for (let dy = -4; dy <= 4; dy++) {
				for (let dx = -4; dx <= 4; dx++) {
					const x = cx + dx;
					const y = cy + dy;
					if (x < 0 || y < 0 || x >= size || y >= size) continue;
					const ring = Math.max(Math.abs(dx), Math.abs(dy));
					this.set(x, y, ring !== 2 && ring !== 4);
				}
			}
		}

		const positions = alignmentPositions(this.version);
		const last = positions.length - 1;
		positions.forEach((cy, i) => {
			positions.forEach((cx, j) => {
				// These three would sit on top of the finder patterns.
				if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
				for (let dy = -2; dy <= 2; dy++) {
					for (let dx = -2; dx <= 2; dx++) {
						this.set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
					}
				}
			});
		});

		// Reserve the format areas now; the real bits depend on the mask.
		this.drawFormat(0);

		if (this.version >= 7) {
			const bits = versionBits(this.version);
			for (let i = 0; i < 18; i++) {
				const bit = ((bits >>> i) & 1) === 1;
				const a = size - 11 + (i % 3);
				const b = Math.floor(i / 3);
				this.set(a, b, bit);
				this.set(b, a, bit);
			}
		}
	}

	drawFormat(mask: number) {
		const { size } = this;
		const bits = formatBits(mask);
		const bit = (i: number) => ((bits >>> i) & 1) === 1;

		for (let i = 0; i <= 5; i++) this.set(8, i, bit(i));
		this.set(8, 7, bit(6));
		this.set(8, 8, bit(7));
		this.set(7, 8, bit(8));
		for (let i = 9; i < 15; i++) this.set(14 - i, 8, bit(i));

		for (let i = 0; i < 8; i++) this.set(size - 1 - i, 8, bit(i));
		for (let i = 8; i < 15; i++) this.set(8, size - 15 + i, bit(i));
		this.set(8, size - 8, true);
	}

	/** Fills the free modules in the zigzag order the standard prescribes. */
	placeData(codewords: Uint8Array) {
		const { size } = this;
		let i = 0;
		for (let right = size - 1; right >= 1; right -= 2) {
			// The vertical timing pattern takes up column 6.
			if (right === 6) right = 5;
			const upward = ((right + 1) & 2) === 0;
			for (let step = 0; step < size; step++) {
				const y = upward ? size - 1 - step : step;
				for (const x of [right, right - 1]) {
					if (this.reserved[y][x] || i >= codewords.length * 8) continue;
					this.dark[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
					i++;
				}
			}
		}
	}

	render(mask: number): QrMatrix {
		this.drawFormat(mask);
		const applies = MASKS[mask];
		return this.dark.map((row, y) =>
			row.map((dark, x) => (this.reserved[y][x] ? dark : dark !== applies(x, y)))
		);
	}
}

/** Penalty score from the standard, used to pick the mask that scans most reliably. */
export function penalty(m: QrMatrix): number {
	const size = m.length;
	let score = 0;

	const scoreLine = (line: boolean[]) => {
		let run = 1;
		for (let i = 1; i <= line.length; i++) {
			if (i < line.length && line[i] === line[i - 1]) {
				run++;
			} else {
				if (run >= 5) score += run - 2;
				run = 1;
			}
		}
		// Patterns that look like a finder, with the quiet zone counting as light.
		const padded = [false, false, false, false, ...line, false, false, false, false];
		for (let i = 0; i + 11 <= padded.length; i++) {
			if (matches(padded, i, FINDER_LIKE_A) || matches(padded, i, FINDER_LIKE_B)) score += 40;
		}
	};

	for (let y = 0; y < size; y++) scoreLine(m[y]);
	for (let x = 0; x < size; x++) scoreLine(m.map((row) => row[x]));

	let darkCount = 0;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			if (m[y][x]) darkCount++;
			if (
				x < size - 1 &&
				y < size - 1 &&
				m[y][x] === m[y][x + 1] &&
				m[y][x] === m[y + 1][x] &&
				m[y][x] === m[y + 1][x + 1]
			) {
				score += 3;
			}
		}
	}

	const total = size * size;
	score += (Math.ceil(Math.abs(darkCount * 20 - total * 10) / total) - 1) * 10;
	return score;
}

const FINDER_LIKE_A = [true, false, true, true, true, false, true, false, false, false, false];
const FINDER_LIKE_B = [false, false, false, false, true, false, true, true, true, false, true];

function matches(line: boolean[], start: number, pattern: boolean[]): boolean {
	for (let i = 0; i < pattern.length; i++) if (line[start + i] !== pattern[i]) return false;
	return true;
}
