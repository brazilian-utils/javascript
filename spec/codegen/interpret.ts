/**
 * Reference interpreter of the utility specs.
 *
 * This is the normative implementation: the conformance vectors come from running it, and every
 * emitted language target has to agree with it. It reads the resolved IR — code point ranges and
 * weight vectors — and never a regex, because a regex shorthand does not mean the same thing in
 * the six languages the specs are emitted to.
 */
import {
	type CharsetRanges,
	type Profile,
	type Step,
	type UtilitySpec,
	checkDigitAlgorithm,
	resolveCharset,
} from "./ir.ts";

/**
 * Whether a code point belongs to a resolved charset.
 *
 * @param {number} code - The code point to test.
 * @param {CharsetRanges} charset - The resolved charset.
 * @returns {boolean} True when the code point is in the set.
 */
const inCharset = (code: number, charset: CharsetRanges): boolean =>
	charset.single.includes(code) || charset.ranges.some(([from, to]) => code >= from && code <= to);

const DIGITS = resolveCharset("ascii-digits");

/**
 * Strips the leading and trailing characters that belong to a charset.
 *
 * @param {string} value - The value to trim.
 * @param {CharsetRanges} charset - The characters to strip.
 * @returns {string} The trimmed value.
 */
const trimBy = (value: string, charset: CharsetRanges): string => {
	let start = 0;
	let end = value.length;

	while (start < end && inCharset(value.charCodeAt(start), charset)) start++;
	while (end > start && inCharset(value.charCodeAt(end - 1), charset)) end--;

	return value.slice(start, end);
};

/**
 * Whether a value is exactly the given digit groups, optionally separated.
 *
 * @param {string} value - The value to match.
 * @param {number[]} groups - The size of each digit group.
 * @param {CharsetRanges} [separators] - The characters allowed between groups, if any.
 * @returns {boolean} True when the whole value matches.
 */
const matchShape = (value: string, groups: number[], separators?: CharsetRanges): boolean => {
	let index = 0;

	for (const [position, size] of groups.entries()) {
		if (position > 0 && separators !== undefined) {
			while (index < value.length && inCharset(value.charCodeAt(index), separators)) index++;
		}

		for (let digit = 0; digit < size; digit++) {
			if (index >= value.length || !inCharset(value.charCodeAt(index), DIGITS)) return false;

			index++;
		}
	}

	return index === value.length;
};

/**
 * Keeps only the characters that belong to a charset.
 *
 * @param {string} value - The value to filter.
 * @param {CharsetRanges} charset - The characters to keep.
 * @returns {string} The filtered value.
 */
const keepCharset = (value: string, charset: CharsetRanges): string => {
	let kept = "";

	for (let index = 0; index < value.length; index++) {
		if (inCharset(value.charCodeAt(index), charset)) kept += value.charAt(index);
	}

	return kept;
};

/**
 * Whether a value is a non empty run of one repeated character.
 *
 * @param {string} value - The value to test.
 * @returns {boolean} True for values such as "00000000000".
 */
const isRepeated = (value: string): boolean =>
	value !== "" && value === value.charAt(0).repeat(value.length);

/**
 * Computes one check digit of a base with the named algorithm.
 *
 * @param {string} base - The digits that precede the check digit.
 * @param {string} algorithm - The algorithm name, as declared in `spec/schema/check-digits.json`.
 * @returns {number} The check digit.
 */
export const computeCheckDigit = (base: string, algorithm: string): number => {
	const spec = checkDigitAlgorithm(algorithm);
	let sum = 0;

	if (spec.weights.kind === "fixed") {
		const { values } = spec.weights;

		for (let index = 0; index < values.length; index++) {
			sum += (base.charCodeAt(index) - 48) * values[index];
		}
	} else {
		let weight = base.length + 1;

		for (let index = 0; index < base.length; index++) {
			sum += (base.charCodeAt(index) - 48) * weight;
			weight--;
		}
	}

	const digit = spec.modulus - (sum % spec.modulus);

	return digit >= spec.clamp.atLeast ? spec.clamp.to : digit;
};

/**
 * Whether every check digit of a value matches its base.
 *
 * @param {string} digits - The sanitized digits.
 * @param {string} algorithm - The algorithm name.
 * @returns {boolean} True when all the declared positions check out.
 */
const verifyCheckDigits = (digits: string, algorithm: string): boolean => {
	const spec = checkDigitAlgorithm(algorithm);

	for (const position of spec.positions) {
		if (digits.length <= position) return false;

		if (
			digits.charCodeAt(position) - 48 !==
			computeCheckDigit(digits.slice(0, position), algorithm)
		)
			return false;
	}

	return true;
};

/**
 * Lays a value over a pattern: `0` copies a character, `*` hides one, anything else separates.
 *
 * @param {string} value - The sanitized value.
 * @param {string} pattern - The pattern to lay it over.
 * @param {boolean} pad - Whether to left pad the value with zeros up to the pattern's slots.
 * @returns {string} The formatted value.
 */
export const applyPattern = (value: string, pattern: string, pad: boolean): string => {
	let padded = value;

	if (pad) {
		let slots = 0;

		for (const char of pattern) {
			if (char === "0" || char === "*") slots++;
		}

		padded = value.padStart(slots, "0");
	}

	let formatted = "";
	let index = 0;

	for (const char of pattern) {
		if (char === "0" || char === "*") {
			if (index >= padded.length) break;

			formatted += char === "*" ? "*" : padded.charAt(index);
			index++;
		} else if (index < padded.length) {
			formatted += char;
		}
	}

	return formatted;
};

/** Options a formatter profile can declare. */
export type RunOptions = { pad?: boolean; obfuscate?: boolean };

/** The value a utility answers with, by kind: a verdict, a formatted string, or nothing. */
type Outcome = boolean | string | null;

let loadUtilitySync: (id: string) => UtilitySpec = () => {
	throw new Error("interpreter not initialised: call setLoader first");
};

/**
 * Injects the spec loader the `guard-valid` step uses to reach another utility.
 *
 * @param {Function} loader - Loads a utility spec by id.
 * @returns {void}
 */
export const setLoader = (loader: (id: string) => UtilitySpec): void => {
	loadUtilitySync = loader;
};

/**
 * The value a profile answers with when a guard rejects the input.
 *
 * @param {UtilitySpec} spec - The utility being run.
 * @param {Profile} profile - The profile being run.
 * @returns {Outcome} `false` for a validator, `""` or `null` for a formatter.
 */
const rejectionOf = (spec: UtilitySpec, profile: Profile): Outcome => {
	if (spec.kind === "validator") return false;

	return (profile.absent ?? spec.input.onNullish) === "null" ? null : "";
};

/** The mutable state a pipeline threads through its steps. */
type State = { raw: string; digits: string };

/**
 * Runs the `guard-shape` step: the value, trimmed if the profile says so, has to be exactly the
 * declared digit groups.
 *
 * @param {Step} step - The guard-shape step.
 * @param {string} raw - The raw input.
 * @returns {boolean} True when the value matches.
 */
const guardShape = (step: Extract<Step, { op: "guard-shape" }>, raw: string): boolean => {
	const value = step.trim === undefined ? raw : trimBy(raw, resolveCharset(step.trim));
	const separators = step.separators === undefined ? undefined : resolveCharset(step.separators);

	return matchShape(value, step.groups, separators);
};

/**
 * Runs the `guard-charset` step: every character of the raw input has to be allowed.
 *
 * @param {Step} step - The guard-charset step.
 * @param {string} raw - The raw input.
 * @returns {boolean} True when every character is in the allowed set.
 */
const guardCharset = (step: Extract<Step, { op: "guard-charset" }>, raw: string): boolean => {
	const allowed = resolveCharset(step.allow);

	for (let index = 0; index < raw.length; index++) {
		if (!inCharset(raw.charCodeAt(index), allowed)) return false;
	}

	return true;
};

/**
 * Runs one pipeline step.
 *
 * @param {Step} step - The step to run.
 * @param {State} state - The raw input and the digits sanitized so far.
 * @param {RunOptions} options - The options the caller passed.
 * @returns {Outcome | undefined} A value when the step answers, `undefined` to carry on.
 */
const runStep = (step: Step, state: State, options: RunOptions): Outcome | undefined => {
	switch (step.op) {
		case "guard-shape": {
			return guardShape(step, state.raw) ? undefined : false;
		}
		case "guard-charset": {
			return guardCharset(step, state.raw) ? undefined : false;
		}
		case "sanitize": {
			state.digits = keepCharset(state.raw, resolveCharset(step.keep));

			return undefined;
		}
		case "guard-length": {
			return state.digits.length === step.equals ? undefined : false;
		}
		case "guard-repeated": {
			return isRepeated(state.digits) ? false : undefined;
		}
		case "verify-check-digits": {
			return verifyCheckDigits(state.digits, step.checkDigit) ? undefined : false;
		}
		case "guard-valid": {
			// Handled by `run`, which owns the recursion into the referenced utility.
			throw new Error(`${step.utility}: guard-valid must be run by the caller`);
		}
		case "apply-pattern": {
			const obfuscated = step.variants?.["obfuscate"];
			const pattern =
				(options.obfuscate ?? false) && obfuscated !== undefined ? obfuscated : step.pattern;

			return applyPattern(state.digits, pattern, options.pad ?? false);
		}
		default: {
			throw new Error(`unsupported step: ${JSON.stringify(step)}`);
		}
	}
};

/**
 * Runs a profile of a utility against a raw input.
 *
 * @param {UtilitySpec} spec - The utility to run.
 * @param {string} profileName - Which of its profiles to run.
 * @param {unknown} input - The raw input, of any type: a utility never throws on bad input.
 * @param {RunOptions} [options] - The options a formatter profile declares.
 * @returns {Outcome} The declared output of the utility.
 */
export const run = (
	spec: UtilitySpec,
	profileName: string,
	input: unknown,
	options: RunOptions = {},
): Outcome => {
	const profile: Profile | undefined = spec.profiles[profileName];

	if (profile === undefined) throw new Error(`${spec.id} has no profile ${profileName}`);

	const rejection = rejectionOf(spec, profile);

	if (spec.kind === "validator" && typeof input !== "string") return false;
	if (spec.kind === "formatter" && (input === null || input === undefined)) return rejection;

	const state: State = { raw: typeof input === "string" ? input : String(input), digits: "" };

	for (const step of profile.pipeline) {
		if (step.op === "guard-valid") {
			// oxlint-disable-next-line sonarjs/no-extra-arguments, sonarjs/no-use-of-empty-return-value -- `run` recurses into itself, which the analyser reads as a call to an undeclared binding
			if (run(loadUtilitySync(step.utility), step.profile, state.raw) !== true) return rejection;

			continue;
		}

		const outcome = runStep(step, state, options);

		if (outcome === false) return rejection;
		if (outcome !== undefined) return outcome;
	}

	return spec.kind === "validator" ? true : state.digits;
};
