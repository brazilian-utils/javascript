/**
 * Python emitter: produces modules shaped like `brutils/`, with the names and the
 * `None` returning formatter contract that package already exposes.
 */
import { type Step, type UtilitySpec } from "../ir.ts";
import { type Plan, type PlannedFunction, expandPipeline, naming } from "../plan.ts";

/**
 * Renders a string as a Python literal.
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
		else if (code < 0x20 || code > 0x7e) literal += `\\U${code.toString(16).padStart(8, "0")}`;
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
	const found = plan.charsets.find((charset) => charset.name === name);
	const { single, ranges } = found?.ranges ?? { single: [], ranges: [] };

	return [
		...single.map((code) => `code == 0x${code.toString(16)}`),
		...ranges.map(([from, to]) => `(0x${from.toString(16)} <= code <= 0x${to.toString(16)})`),
	].join("\n        or ");
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
			(charset) => `def is_${charset.symbol}(code: int) -> bool:
    """Whether the code point belongs to the ${charset.name} set."""
    return (
        ${charsetTest(plan, charset.name)}
    )`,
		)
		.join("\n\n\n");

	const algorithms = plan.algorithms
		.map((entry) => {
			const { algorithm } = entry;
			const body =
				algorithm.weights.kind === "fixed"
					? `    weights = [${algorithm.weights.values.join(", ")}]
    total = sum(int(base[index]) * weight for index, weight in enumerate(weights))`
					: `    total = sum(
        int(digit) * (len(base) + 1 - index) for index, digit in enumerate(base)
    )`;

			return `def check_digit_${entry.symbol}(base: str) -> int:
    """${algorithm.description}

    Official source: ${algorithm.source}
    """
${body}
    digit = ${algorithm.modulus} - (total % ${algorithm.modulus})

    return ${algorithm.clamp.to} if digit >= ${algorithm.clamp.atLeast} else digit


def verify_${entry.symbol}(digits: str) -> bool:
    """Whether every check digit of the value matches its base."""
    for position in (${algorithm.positions.join(", ")},):
        if len(digits) <= position:
            return False
        if int(digits[position]) != check_digit_${entry.symbol}(digits[:position]):
            return False

    return True`;
		})
		.join("\n\n\n");

	return `# Code generated from spec/utilities by spec/codegen. DO NOT EDIT.
"""Runtime shared by the generated utilities."""

from typing import Callable, List, Optional

${charsets}


def trim_by(value: str, in_set: Callable[[int], bool]) -> str:
    """Strips the leading and trailing characters that belong to the set."""
    start, end = 0, len(value)

    while start < end and in_set(ord(value[start])):
        start += 1
    while end > start and in_set(ord(value[end - 1])):
        end -= 1

    return value[start:end]


def keep_by(value: str, in_set: Callable[[int], bool]) -> str:
    """Keeps only the characters that belong to the set."""
    return "".join(char for char in value if in_set(ord(char)))


def match_shape(
    value: str, groups: List[int], in_separator: Optional[Callable[[int], bool]] = None
) -> bool:
    """Whether the value is exactly the digit groups, optionally separated."""
    index = 0

    for position, size in enumerate(groups):
        if position > 0 and in_separator is not None:
            while index < len(value) and in_separator(ord(value[index])):
                index += 1

        for _ in range(size):
            if index >= len(value) or not is_ascii_digits(ord(value[index])):
                return False
            index += 1

    return index == len(value)


def is_repeated(value: str) -> bool:
    """Whether the value is a non empty run of one repeated character."""
    return value != "" and value == value[0] * len(value)


def apply_pattern(value: str, pattern: str, pad: bool) -> str:
    """Lays the value over the pattern: "0" copies, "*" hides, anything else separates."""
    padded = value

    if pad:
        slots = sum(1 for char in pattern if char in "0*")
        padded = value.rjust(slots, "0")

    formatted = ""
    index = 0

    for char in pattern:
        if char in "0*":
            if index >= len(padded):
                break
            formatted += "*" if char == "*" else padded[index]
            index += 1
        elif index < len(padded):
            formatted += char

    return formatted


${algorithms}
`;
};

/**
 * The value the generated function returns when a guard rejects the input.
 *
 * @param {UtilitySpec} spec - The utility being emitted.
 * @param {PlannedFunction} planned - The planned function.
 * @returns {string} The literal to return.
 */
const bailValue = (spec: UtilitySpec, planned: PlannedFunction): string => {
	if (spec.kind === "validator") return "False";

	return planned.nullable ? "None" : '""';
};

/**
 * Renders one pipeline step as statements of the target language.
 *
 * @param {Step} step - The step to render.
 * @param {UtilitySpec} spec - The utility being emitted.
 * @param {PlannedFunction} planned - The planned function.
 * @returns {string} The rendered statements.
 */
const renderStep = (step: Step, spec: UtilitySpec, planned: PlannedFunction): string => {
	const bail = bailValue(spec, planned);

	switch (step.op) {
		case "guard-shape": {
			const value = step.trim === undefined ? "raw" : `trim_by(raw, is_${naming.snake(step.trim)})`;
			const separators =
				step.separators === undefined ? "" : `, is_${naming.snake(step.separators)}`;

			return `    if not match_shape(${value}, [${step.groups.join(", ")}]${separators}):
        return ${bail}`;
		}
		case "guard-charset": {
			return `    for char in raw:
        if not (${step.allow.map((name) => `is_${naming.snake(name)}(ord(char))`).join(" or ")}):
            return ${bail}`;
		}
		case "sanitize": {
			return `    digits = keep_by(raw, is_${naming.snake(step.keep)})`;
		}
		case "guard-length": {
			return `    if len(digits) != ${step.equals}:
        return ${bail}`;
		}
		case "guard-repeated": {
			return `    if is_repeated(digits):
        return ${bail}`;
		}
		case "verify-check-digits": {
			return `    if not verify_${naming.snake(step.checkDigit)}(digits):
        return ${bail}`;
		}
		case "apply-pattern": {
			const pattern =
				step.variants?.["obfuscate"] !== undefined && planned.options.includes("obfuscate")
					? `${escapeLiteral(step.variants["obfuscate"])} if obfuscate else ${escapeLiteral(step.pattern)}`
					: escapeLiteral(step.pattern);
			const pad = planned.options.includes("pad") ? "pad" : "False";

			return `    return apply_pattern(digits, ${pattern}, ${pad})`;
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
	if (spec.kind === "validator") return "bool";

	return planned.nullable ? "Optional[str]" : "str";
};

/**
 * What closes the generated body: the success value, or nothing when a step already returned.
 *
 * @param {UtilitySpec} spec - The utility being emitted.
 * @param {PlannedFunction} planned - The planned function.
 * @returns {string} The closing lines, which may be empty.
 */
const tailOf = (spec: UtilitySpec, planned: PlannedFunction): string => {
	if (spec.kind === "validator") return "\n\n    return True";

	const returnsEarly = expandPipeline(planned.profile).some((step) => step.op === "apply-pattern");

	return returnsEarly ? "" : "\n\n    return digits";
};

/**
 * Renders one planned function, documentation included.
 *
 * @param {PlannedFunction} planned - The function to render.
 * @returns {string} The rendered source.
 */
const renderFunction = (planned: PlannedFunction): string => {
	const { spec } = planned;
	const returnType = returnTypeOf(spec, planned);
	const parameters =
		spec.kind === "validator"
			? `${naming.snake(spec.input.name)}: object`
			: ["value: object", ...planned.options.map((option) => `${option}: bool = False`)].join(", ");

	const absent = planned.nullable ? "None" : '""';
	const head =
		spec.kind === "validator"
			? `    if not isinstance(${naming.snake(spec.input.name)}, str):
        return False

    raw = ${naming.snake(spec.input.name)}`
			: `    if value is None:
        return ${absent}

    raw = value if isinstance(value, str) else str(value)`;

	const body = expandPipeline(planned.profile)
		.map((step) => renderStep(step, spec, planned))
		.join("\n");
	const tail = tailOf(spec, planned);

	return `def ${planned.name}(${parameters}) -> ${returnType}:
    """${spec.summary}

    Profile: ${planned.profileName} — ${planned.profile.description}

${spec.sources.map((source) => `    ${source.role === "official" ? "Official" : "Based on"}: ${source.url}`).join("\n")}
    """
${head}

${body}${tail}`;
};

/**
 * Emits every file of this target.
 *
 * @param {Plan} plan - The emission plan.
 * @returns {Record<string, string>} The files, by path relative to the target directory.
 */
export const emit = (plan: Plan): Record<string, string> => {
	const files: Record<string, string> = {
		"_spec_runtime.py": prelude(plan),
		"brutils/__init__.py": "# Code generated from spec/utilities by spec/codegen. DO NOT EDIT.\n",
	};
	const modules = new Map<string, PlannedFunction[]>();

	for (const planned of plan.functions) {
		modules.set(planned.module, [...(modules.get(planned.module) ?? []), planned]);
	}

	for (const [module, functions] of modules) {
		const path = `${module.replaceAll(".", "/")}.py`;
		const source = functions.map((planned) => renderFunction(planned)).join("\n\n\n");
		const symbols = [
			"trim_by",
			"keep_by",
			"match_shape",
			"is_repeated",
			"apply_pattern",
			...plan.charsets.map((charset) => `is_${charset.symbol}`),
			...plan.algorithms.map((entry) => `verify_${entry.symbol}`),
		].filter((symbol) => new RegExp(`\\b${symbol}\\b`).test(source));
		const typing = source.includes("Optional[str]") ? "from typing import Optional\n\n" : "";

		files[path] = `# Code generated from spec/utilities by spec/codegen. DO NOT EDIT.
"""${functions.map((planned) => planned.spec.summary).join(" ")}"""

${typing}from _spec_runtime import (
${symbols.map((symbol) => `    ${symbol},`).join("\n")}
)


${source}
`;
	}

	return files;
};
