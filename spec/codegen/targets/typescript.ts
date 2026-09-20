/**
 * TypeScript emitter: produces modules shaped like the ones under `src/`, so the generated
 * output can be diffed against the handwritten package it is meant to replace.
 */
import { type Step, type UtilitySpec } from "../ir.ts";
import { type Plan, type PlannedFunction, expandPipeline, naming } from "../plan.ts";

/**
 * Renders a string as a TypeScript literal.
 *
 * @param {string} value - The text to render.
 * @returns {string} The literal, quotes included.
 */
const escapeLiteral = (value: string): string => {
	let literal = '"';

	for (const char of value) {
		const code = char.codePointAt(0) ?? 0;

		if (char === '"') literal += String.raw`\"`;
		else if (char === "\\") literal += String.raw`\\`;
		else if (code < 0x20 || code > 0x7e) literal += `\\u{${code.toString(16)}}`;
		else literal += char;
	}

	return `${literal}"`;
};

/**
 * Renders the membership test of a charset as an expression of the target language.
 *
 * @param {Plan} plan - The emission plan holding the resolved charsets.
 * @param {string} name - The charset name.
 * @returns {string} The boolean expression.
 */
const charsetTest = (plan: Plan, name: string): string => {
	const { single, ranges } = plan.charsets.find((charset) => charset.name === name)?.ranges ?? {
		single: [],
		ranges: [],
	};
	const tests = [
		...single.map((code) => `code === 0x${code.toString(16)}`),
		...ranges.map(
			([from, to]) => `(code >= 0x${from.toString(16)} && code <= 0x${to.toString(16)})`,
		),
	];

	return tests.join(" ||\n\t");
};

/**
 * Renders the runtime shared by every generated utility of this target.
 *
 * @param {Plan} plan - The emission plan.
 * @returns {string} The prelude source.
 */
const prelude = (plan: Plan): string => {
	const charsets = plan.charsets
		.map(
			(
				charset,
			) => `/** ${charset.name}: ${charset.ranges.single.length + charset.ranges.ranges.length} code point runs. */
export const is${naming.pascal(charset.name)} = (code: number): boolean =>
	${charsetTest(plan, charset.name)};`,
		)
		.join("\n\n");

	const algorithms = plan.algorithms
		.map((entry) => {
			const { algorithm } = entry;
			const body =
				algorithm.weights.kind === "fixed"
					? `	const weights = [${algorithm.weights.values.join(", ")}];
	let sum = 0;

	for (let index = 0; index < weights.length; index++) {
		sum += (base.charCodeAt(index) - 48) * weights[index];
	}`
					: `	let sum = 0;
	let weight = base.length + 1;

	for (let index = 0; index < base.length; index++) {
		sum += (base.charCodeAt(index) - 48) * weight;
		weight--;
	}`;

			return `/**
 * ${algorithm.description}
 *
 * @see Official: ${algorithm.source}
 */
export const checkDigit${naming.pascal(entry.name)} = (base: string): number => {
${body}

	const digit = ${algorithm.modulus} - (sum % ${algorithm.modulus});

	return digit >= ${algorithm.clamp.atLeast} ? ${algorithm.clamp.to} : digit;
};

export const verify${naming.pascal(entry.name)} = (digits: string): boolean => {
	for (const position of [${algorithm.positions.join(", ")}]) {
		if (digits.length <= position) return false;
		if (digits.charCodeAt(position) - 48 !== checkDigit${naming.pascal(entry.name)}(digits.slice(0, position)))
			return false;
	}

	return true;
};`;
		})
		.join("\n\n");

	return `// Code generated from spec/utilities by spec/codegen. DO NOT EDIT.

${charsets}

export const trimBy = (value: string, inSet: (code: number) => boolean): string => {
	let start = 0;
	let end = value.length;

	while (start < end && inSet(value.charCodeAt(start))) start++;
	while (end > start && inSet(value.charCodeAt(end - 1))) end--;

	return value.slice(start, end);
};

export const keepBy = (value: string, inSet: (code: number) => boolean): string => {
	let kept = "";

	for (let index = 0; index < value.length; index++) {
		if (inSet(value.charCodeAt(index))) kept += value.charAt(index);
	}

	return kept;
};

export const matchShape = (
	value: string,
	groups: number[],
	inSeparator?: (code: number) => boolean,
): boolean => {
	let index = 0;

	for (const [position, size] of groups.entries()) {
		if (position > 0 && inSeparator !== undefined) {
			while (index < value.length && inSeparator(value.charCodeAt(index))) index++;
		}

		for (let digit = 0; digit < size; digit++) {
			if (index >= value.length || !isAsciiDigits(value.charCodeAt(index))) return false;
			index++;
		}
	}

	return index === value.length;
};

export const isRepeated = (value: string): boolean =>
	value !== "" && value === value.charAt(0).repeat(value.length);

export const applyPattern = (value: string, pattern: string, pad: boolean): string => {
	let padded = value;

	if (pad) {
		const slots = [...pattern].filter((char) => char === "0" || char === "*").length;
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

${algorithms}
`;
};

const reject = (spec: UtilitySpec): string => (spec.kind === "validator" ? "false" : '""');

/**
 * Renders one pipeline step as statements of the target language.
 *
 * @param {Step} step - The step to render.
 * @param {UtilitySpec} spec - The utility being emitted.
 * @param {PlannedFunction} planned - The planned function.
 * @returns {string} The rendered statements.
 */
const renderStep = (step: Step, spec: UtilitySpec, planned: PlannedFunction): string => {
	const bail = planned.nullable ? "null" : reject(spec);

	switch (step.op) {
		case "guard-shape": {
			const value = step.trim === undefined ? "raw" : `trimBy(raw, is${naming.pascal(step.trim)})`;
			const separators =
				step.separators === undefined ? "" : `, is${naming.pascal(step.separators)}`;

			return `	if (!matchShape(${value}, [${step.groups.join(", ")}]${separators})) return ${bail};`;
		}
		case "guard-charset": {
			return `	for (let index = 0; index < raw.length; index++) {
		const code = raw.charCodeAt(index);

		if (!(${step.allow.map((name) => `is${naming.pascal(name)}(code)`).join(" || ")})) return ${bail};
	}`;
		}
		case "sanitize": {
			return `	const digits = keepBy(raw, is${naming.pascal(step.keep)});`;
		}
		case "guard-length": {
			return `	if (digits.length !== ${step.equals}) return ${bail};`;
		}
		case "guard-repeated": {
			return `	if (isRepeated(digits)) return ${bail};`;
		}
		case "verify-check-digits": {
			return `	if (!verify${naming.pascal(step.checkDigit)}(digits)) return ${bail};`;
		}
		case "apply-pattern": {
			const pattern =
				step.variants?.["obfuscate"] !== undefined && planned.options.includes("obfuscate")
					? `(options?.obfuscate ?? false) ? ${escapeLiteral(step.variants["obfuscate"])} : ${escapeLiteral(step.pattern)}`
					: escapeLiteral(step.pattern);
			const pad = planned.options.includes("pad") ? "options?.pad ?? false" : "false";

			return `	return applyPattern(digits, ${pattern}, ${pad});`;
		}
		case "guard-valid": {
			// `expandPipeline` replaces this step with the referenced profile's own steps.
			throw new Error(`${spec.id}: guard-valid reached the emitter unexpanded`);
		}
		default: {
			throw new Error(`unsupported step: ${JSON.stringify(step)}`);
		}
	}
};

/**
 * The return type the generated function declares.
 *
 * @param {UtilitySpec} spec - The utility being emitted.
 * @param {PlannedFunction} planned - The planned function.
 * @returns {string} The type, spelled in the target language.
 */
const returnTypeOf = (spec: UtilitySpec, planned: PlannedFunction): string => {
	if (spec.kind === "validator") return "boolean";

	return planned.nullable ? "string | null" : "string";
};

/**
 * What closes the generated body: the success value, or nothing when a step already returned.
 *
 * @param {UtilitySpec} spec - The utility being emitted.
 * @param {boolean} needsSanitize - Whether the pipeline never bound `digits`.
 * @returns {string} The closing lines, which may be empty.
 */
const tailOf = (spec: UtilitySpec, needsSanitize: boolean): string => {
	if (spec.kind === "validator") return "\n\n	return true;";

	return needsSanitize ? "\n\n	return digits;" : "";
};

/**
 * Renders one planned function, documentation included.
 *
 * @param {PlannedFunction} planned - The function to render.
 * @returns {string} The rendered source.
 */
const renderFunction = (planned: PlannedFunction): string => {
	const { spec } = planned;
	const optionsType = `${naming.pascal(spec.id)}Options`;
	const hasOptions = planned.options.length > 0;
	const returnType = returnTypeOf(spec, planned);
	const parameter =
		spec.kind === "validator" ? `${spec.input.name}: unknown` : `value: string | number`;
	const optionsParameter = hasOptions ? `, options?: ${optionsType}` : "";

	const absent = planned.nullable ? "null" : '""';
	const head =
		spec.kind === "validator"
			? `	if (typeof ${spec.input.name} !== "string") return false;

	const raw = ${spec.input.name};`
			: `	if (value === null || value === undefined) return ${absent};

	const raw = String(value);`;

	// A pipeline that never sanitizes still needs `digits` in scope for the closing return.
	const needsSanitize = !expandPipeline(planned.profile).some((step) => step.op === "sanitize");
	const body = expandPipeline(planned.profile)
		.map((step) => renderStep(step, spec, planned))
		.join("\n");
	const tail = tailOf(spec, needsSanitize);

	const options = hasOptions
		? `/** Options of \`${planned.name}\`. */
export type ${optionsType} = {
${planned.options.map((option) => `	/** ${option === "pad" ? "Left pads the value with zeros up to the pattern's slot count" : "Hides the digits the pattern marks with \\`*\\`"} (default: \`false\`). */\n	${option}?: boolean;`).join("\n")}
};

`
		: "";

	return `${options}/**
 * ${spec.summary}
 *
 * Profile: \`${planned.profileName}\` — ${planned.profile.description}
 *
${spec.sources.map((source) => ` * @see ${source.role === "official" ? "Official" : "Based on"}: ${source.url}`).join("\n")}
 */
export const ${planned.name} = (${parameter}${optionsParameter}): ${returnType} => {
${head}

${body}${tail}
};
`;
};

/**
 * Emits every file of this target.
 *
 * @param {Plan} plan - The emission plan.
 * @returns {Record<string, string>} The files, by path relative to the target directory.
 */
export const emit = (plan: Plan): Record<string, string> => {
	const files: Record<string, string> = { "_spec/runtime.ts": prelude(plan) };

	for (const planned of plan.functions) {
		const imports = new Set<string>();
		const source = renderFunction(planned);

		for (const symbol of [
			"trimBy",
			"keepBy",
			"matchShape",
			"isRepeated",
			"applyPattern",
			...plan.charsets.map((charset) => `is${naming.pascal(charset.name)}`),
			...plan.algorithms.map((entry) => `verify${naming.pascal(entry.name)}`),
		]) {
			if (new RegExp(`\\b${symbol}\\b`).test(source)) imports.add(symbol);
		}

		files[`${planned.module}/${planned.module}.ts`] =
			`// Code generated from spec/utilities/${planned.spec.id}.json by spec/codegen. DO NOT EDIT.\nimport {\n${[
				...imports,
			]
				.sort()
				.map((symbol) => `\t${symbol},`)
				.join("\n")}\n} from "../_spec/runtime.ts";\n\n${source}`;
	}

	return files;
};
