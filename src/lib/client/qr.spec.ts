import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import {
	alignmentPositions,
	dataCapacity,
	encodeQr,
	formatBits,
	rsEcc,
	versionBits,
	type QrMatrix
} from './qr';

/** Draws the matrix with a quiet zone, the way a camera would see it, and decodes it. */
function decode(matrix: QrMatrix): string | undefined {
	const scale = 4;
	const width = (matrix.length + 8) * scale;
	const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
	matrix.forEach((row, y) =>
		row.forEach((dark, x) => {
			if (!dark) return;
			for (let dy = 0; dy < scale; dy++) {
				for (let dx = 0; dx < scale; dx++) {
					const offset = (((y + 4) * scale + dy) * width + (x + 4) * scale + dx) * 4;
					pixels.fill(0, offset, offset + 3);
				}
			}
		})
	);
	return jsQR(pixels, width, width, { inversionAttempts: 'dontInvert' })?.data;
}

function versionOf(matrix: QrMatrix): number {
	return (matrix.length - 17) / 4;
}

/** Bytes a version holds in byte mode at level M. */
function byteCapacity(version: number): number {
	return Math.floor((dataCapacity(version) * 8 - 4 - (version < 10 ? 8 : 16)) / 8);
}

describe('encodeQr', () => {
	it('encodes a note link so that it decodes again', () => {
		const link = 'https://emberslip.example.com/n#vB3r9Qm_2kZxTq0aL7pWcN4sYhE1uJdF8gR6oKiM5tA';
		const matrix = encodeQr(link);
		expect(decode(matrix)).toBe(link);
		expect(versionOf(matrix)).toBe(5);
	});

	it('round-trips text that needs several blocks and version information', () => {
		for (const length of [1, 14, 15, 60, 107, 123, 200, 400, 700]) {
			const text = Array.from({ length }, (_, i) => 'abcdefghijKLMNOP0123-_#/'[i % 24]).join('');
			const matrix = encodeQr(text);
			expect(decode(matrix), `${length} characters`).toBe(text);
		}
	});

	it('encodes UTF-8', () => {
		expect(decode(encodeQr('Grüße, 🔥'))).toBe('Grüße, 🔥');
	});

	it('picks the smallest version that fits', () => {
		for (const version of [1, 2, 9, 10, 26]) {
			const fits = 'x'.repeat(byteCapacity(version));
			expect(versionOf(encodeQr(fits))).toBe(version);
			expect(versionOf(encodeQr(fits + 'x'))).toBe(version + 1);
		}
	});

	it('refuses text that no version can hold', () => {
		expect(() => encodeQr('x'.repeat(byteCapacity(40)))).not.toThrow();
		expect(() => encodeQr('x'.repeat(byteCapacity(40) + 1))).toThrow(RangeError);
	});
});

describe('QR code building blocks', () => {
	it('matches the byte capacities from the standard', () => {
		expect([1, 5, 10, 20, 40].map(byteCapacity)).toEqual([14, 84, 213, 666, 2331]);
	});

	it('computes Reed-Solomon codewords', () => {
		// "HELLO WORLD" as version 1-M, from the worked example on thonky.com.
		const data = Uint8Array.from([
			32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17
		]);
		expect([...rsEcc(data, 10)]).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
	});

	it('encodes format and version information', () => {
		expect(formatBits(0)).toBe(0b101010000010010);
		expect(formatBits(5)).toBe(0b100000011001110);
		expect(versionBits(7)).toBe(0b000111110010010100);
		expect(versionBits(40)).toBe(0b101000110001101001);
	});

	it('places alignment patterns where the standard does', () => {
		expect(alignmentPositions(1)).toEqual([]);
		expect(alignmentPositions(2)).toEqual([6, 18]);
		expect(alignmentPositions(7)).toEqual([6, 22, 38]);
		expect(alignmentPositions(32)).toEqual([6, 34, 60, 86, 112, 138]);
		expect(alignmentPositions(40)).toEqual([6, 30, 58, 86, 114, 142, 170]);
	});
});
