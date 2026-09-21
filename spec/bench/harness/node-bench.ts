/**
 * Node arms: handwritten source, generated source, and the shared Rust core over WebAssembly.
 *
 * Every arm validates the same 1000 inputs and reports the best nanoseconds per call over
 * several repetitions, plus the number of valid inputs it found, so a wrong arm cannot win by
 * doing less work.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Validator = (value: string) => boolean;

type WasmExports = {
	memory: WebAssembly.Memory;
	cpf_is_valid: (ptr: number, len: number) => number;
	cpf_is_valid_batch: (input: number, inputLen: number, output: number, count: number) => number;
	arena_alloc: (len: number) => number;
	arena_reset: () => void;
};

const benchDir = resolve(import.meta.dirname, "..");
const corpus = JSON.parse(readFileSync(resolve(benchDir, "corpus.json"), "utf8")) as string[];
const REPS = Number(process.env["BENCH_REPS"] ?? 7);
const SCRATCH_SIZE = 64;

/**
 * Times one arm over the whole corpus.
 *
 * @param {string} arm - The arm name.
 * @param {Function} run - Validates every input and returns how many were valid.
 * @returns {object} The measurement, ready to print.
 */
const measure = (
	arm: string,
	run: (inputs: string[]) => number,
): { lang: string; arm: string; nsPerOp: number; valid: number } => {
	for (let warm = 0; warm < 3; warm++) run(corpus);

	let best = Number.POSITIVE_INFINITY;
	let valid = 0;

	for (let rep = 0; rep < REPS; rep++) {
		const start = process.hrtime.bigint();

		valid = run(corpus);

		const elapsed = Number(process.hrtime.bigint() - start);

		best = Math.min(best, elapsed / corpus.length);
	}

	return { lang: "node", arm, nsPerOp: Number(best.toFixed(1)), valid };
};

/**
 * Wraps a validator into an arm that counts how many inputs it accepts.
 *
 * @param {Function} isValid - The validator under test.
 * @returns {Function} The arm.
 */
const countWith =
	(isValid: Validator) =>
	(inputs: string[]): number => {
		let valid = 0;

		for (const input of inputs) if (isValid(input)) valid++;

		return valid;
	};

const shipped = (await import(resolve(benchDir, ".build/shipped.mjs"))) as {
	isValidCpf: Validator;
};
const generated = (await import(
	resolve(benchDir, ".spec-masked-strict/generated/typescript/is-valid-cpf/is-valid-cpf.ts")
)) as { isValidCpf: Validator };

const wasmBytes = readFileSync(
	resolve(benchDir, "core/target/wasm32-unknown-unknown/release/brutils_bench_core.wasm"),
);
const { instance } = await WebAssembly.instantiate(wasmBytes, {});
const wasm = instance.exports as unknown as WasmExports;
const encoder = new TextEncoder();

// One scratch buffer, reused: encoding into a fresh array per call would measure the allocator.
wasm.arena_reset();

const scratchPtr = wasm.arena_alloc(SCRATCH_SIZE);

const runWasm = (inputs: string[]): number => {
	const view = new Uint8Array(wasm.memory.buffer);
	let valid = 0;

	for (const input of inputs) {
		const { written } = encoder.encodeInto(
			input,
			view.subarray(scratchPtr, scratchPtr + SCRATCH_SIZE),
		);

		if (wasm.cpf_is_valid(scratchPtr, written) === 1) valid++;
	}

	return valid;
};

wasm.arena_reset();

const batchInputPtr = wasm.arena_alloc(1 << 18);
const batchOutputPtr = wasm.arena_alloc(corpus.length);

const runWasmBatch = (inputs: string[]): number => {
	const view = new Uint8Array(wasm.memory.buffer);
	const lengths = new DataView(wasm.memory.buffer);
	let offset = batchInputPtr;

	for (const input of inputs) {
		const { written } = encoder.encodeInto(
			input,
			view.subarray(offset + 4, offset + 4 + SCRATCH_SIZE),
		);

		lengths.setUint32(offset, written, true);
		offset += 4 + written;
	}

	wasm.cpf_is_valid_batch(batchInputPtr, offset - batchInputPtr, batchOutputPtr, inputs.length);

	let valid = 0;

	for (let index = 0; index < inputs.length; index++) {
		if (view[batchOutputPtr + index] === 1) valid++;
	}

	return valid;
};

const results = [
	measure("handwritten", countWith(shipped.isValidCpf)),
	measure("generated", countWith(generated.isValidCpf)),
	measure("wasm", runWasm),
	measure("wasm-batch", runWasmBatch),
];

for (const result of results) console.log(JSON.stringify(result));
