/**
 * Turns the specs into the flat plan an emitter needs: which charsets and check digit
 * algorithms to lay down in the prelude, and which function to emit for the target, under the
 * name and with the option set that target's package already exposes.
 */
import {
	type CharsetRanges,
	type CheckDigitAlgorithm,
	type Profile,
	type Step,
	type UtilitySpec,
	checkDigitAlgorithm,
	loadAll,
	resolveCharset,
} from "./ir.ts";

export type PlannedFunction = {
	spec: UtilitySpec;
	profile: Profile;
	profileName: string;
	name: string;
	module: string;
	options: string[];
	/** Whether the function may answer "no value": a formatter whose profile is absent as null. */
	nullable: boolean;
};

export type Plan = {
	target: string;
	charsets: { name: string; symbol: string; ranges: CharsetRanges }[];
	algorithms: { name: string; symbol: string; algorithm: CheckDigitAlgorithm }[];
	functions: PlannedFunction[];
};

/**
 * Converts a kebab-case id to PascalCase.
 *
 * @param {string} value - The id to convert.
 * @returns {string} The PascalCase form.
 */
const pascal = (value: string): string =>
	value
		.split(/[-_]/)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");

/**
 * Converts a kebab-case id to camelCase.
 *
 * @param {string} value - The id to convert.
 * @returns {string} The camelCase form.
 */
const camel = (value: string): string => {
	const pascalCase = pascal(value);

	return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
};

/**
 * Converts a kebab-case id to snake_case.
 *
 * @param {string} value - The id to convert.
 * @returns {string} The snake_case form.
 */
const snake = (value: string): string => value.replaceAll("-", "_");

export const naming = { pascal, camel, snake };

/**
 * The charsets one step references.
 *
 * @param {Step} step - The step to inspect.
 * @returns {string[]} The charset names, which may be empty.
 */
const charsetsOf = (step: Step): string[] => {
	if (step.op === "guard-shape")
		return [step.trim, step.separators].filter((name): name is string => name !== undefined);
	if (step.op === "guard-charset") return step.allow;
	if (step.op === "sanitize") return [step.keep];

	return [];
};

/**
 * Flattens a profile's pipeline into the steps an emitter renders one by one: `guard-valid`
 * becomes the referenced profile's own steps, and the duplicate `sanitize` that inlining
 * introduces is dropped, so the target language binds `digits` exactly once.
 *
 * @param {Profile} profile - The profile to flatten.
 * @returns {Step[]} The steps to render, in order.
 */
export const expandPipeline = (profile: Profile): Step[] => {
	const specs = loadAll();
	const expanded: Step[] = [];

	for (const step of profile.pipeline) {
		if (step.op !== "guard-valid") {
			expanded.push(step);
			continue;
		}

		const referenced = specs.find((candidate) => candidate.id === step.utility);

		if (referenced === undefined) throw new Error(`unknown referenced utility ${step.utility}`);

		expanded.push(...referenced.profiles[step.profile].pipeline);
	}

	const sanitized = new Set<string>();

	return expanded.filter((step) => {
		if (step.op !== "sanitize") return true;

		const key = `${step.keep}->${step.into}`;
		const seen = sanitized.has(key);

		sanitized.add(key);

		return !seen;
	});
};

/**
 * Builds the emission plan for one target language.
 *
 * @param {string} target - The target language id, as used in a spec's `adopted` map.
 * @returns {Plan} Everything the emitter for that language needs.
 */
export const planFor = (target: string): Plan => {
	const specs = loadAll();
	const charsetNames = new Set<string>(["ascii-digits"]);
	const algorithmNames = new Set<string>();
	const functions: PlannedFunction[] = [];

	for (const spec of specs) {
		const adoption = spec.adopted[target];

		if (adoption === undefined) continue;

		const profile = spec.profiles[adoption.profile];

		if (profile === undefined)
			throw new Error(`${spec.id}: ${target} adopts unknown profile ${adoption.profile}`);

		const names = spec.names[target];

		if (names === undefined) throw new Error(`${spec.id}: no name for target ${target}`);

		for (const step of expandPipeline(profile)) {
			for (const charset of charsetsOf(step)) charsetNames.add(charset);
			if (step.op === "verify-check-digits") algorithmNames.add(step.checkDigit);
		}

		functions.push({
			spec,
			profile,
			profileName: adoption.profile,
			name: names.function,
			module: names.module,
			options: adoption.options ?? (profile.options ?? []).map((option) => option.name),
			nullable: (profile.absent ?? spec.input.onNullish) === "null",
		});
	}

	return {
		target,
		charsets: [...charsetNames].sort().map((name) => ({
			name,
			symbol: snake(name),
			ranges: resolveCharset(name),
		})),
		algorithms: [...algorithmNames].sort().map((name) => ({
			name,
			symbol: snake(name),
			algorithm: checkDigitAlgorithm(name),
		})),
		functions,
	};
};
