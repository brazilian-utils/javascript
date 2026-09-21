/**
 * A hand-rolled seeded PRNG (splitmix32 stream, mulberry32 mixing).
 *
 * The generator never takes a dependency on a general-purpose property-testing library (see
 * `docs/fuzzing.md` for why): a 32-bit generator with a handful of derived helpers is all a
 * program generator needs, and it keeps `engine/`'s dependency count exactly where it was.
 *
 * Every method is a pure function of the current state, so replaying a seed reproduces the exact
 * same sequence of decisions on any machine, forever — the whole point of printing a seed on
 * failure.
 */

export class Rng {
	private state: number;

	constructor(seed: number) {
		// Fold the seed through a couple of rounds before use so that nearby seeds (1, 2, 3, …, as a
		// human picks when replaying) do not produce visibly correlated first draws.
		this.state = (seed ^ 0x9e3779b9) >>> 0;
		this.next();
		this.next();
	}

	/** Uniform in `[0, 2^32)`. */
	private next(): number {
		// mulberry32
		this.state = (this.state + 0x6d2b79f5) >>> 0;
		let t = this.state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	/** A float in `[0, 1)`. */
	float(): number {
		return this.next();
	}

	/** True with probability `p` (default: a fair coin). */
	bool(p = 0.5): boolean {
		return this.next() < p;
	}

	/** An integer in `[lo, hi]` inclusive, as a plain number. Both bounds are safe integers. */
	int(lo: number, hi: number): number {
		if (hi < lo) throw new Error(`Rng.int: empty range [${lo}, ${hi}]`);
		return lo + Math.floor(this.next() * (hi - lo + 1));
	}

	/** An integer in `[lo, hi]` inclusive, as a bigint, for ranges too wide for `number`. */
	bigint(lo: bigint, hi: bigint): bigint {
		if (hi < lo) throw new Error(`Rng.bigint: empty range [${lo}, ${hi}]`);
		const span = hi - lo + 1n;
		if (span <= 0x100000000n) {
			return lo + BigInt(this.int(0, Number(span) - 1));
		}
		// A wide span (only ever the platform-safe domain in this generator): compose two 32-bit
		// draws rather than lose precision to `float() * Number(span)`.
		const hiPart = BigInt(this.int(0, 0xffffffff));
		const loPart = BigInt(this.int(0, 0xffffffff));
		return lo + ((hiPart << 32n) | loPart) % span;
	}

	/** One element of a non-empty array. */
	pick<T>(items: readonly T[]): T {
		if (items.length === 0) throw new Error("Rng.pick: empty array");
		return items[this.int(0, items.length - 1)]!;
	}

	/** An index into a weighted list of options, each `[weight, value]`. */
	weighted<T>(options: readonly (readonly [number, T])[]): T {
		const total = options.reduce((sum, [w]) => sum + w, 0);
		let draw = this.float() * total;
		for (const [weight, value] of options) {
			draw -= weight;
			if (draw <= 0) return value;
		}
		return options[options.length - 1]![1];
	}
}

/**
 * Derives an independent-looking sub-seed for program `index` under a master `seed`, so a batch
 * of N generated programs is addressable one at a time: replaying `(seed, index)` reproduces
 * exactly the program the batch produced at that position, independent of batch size or of what
 * happened to any other program in the run.
 */
export function subSeed(seed: number, index: number): number {
	// splitmix32 step: cheap, well-mixed, and needs no state beyond the two inputs.
	let z = (seed + Math.imul(index + 1, 0x9e3779b9)) >>> 0;
	z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
	z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
	return (z ^ (z >>> 16)) >>> 0;
}
