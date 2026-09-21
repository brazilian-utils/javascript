/**
 * Python emitter: produces modules shaped like `brutils/`, with the names and the
 * `None` returning formatter contract that package already exposes.
 */
import { type Step, type UtilitySpec, resolveCharset } from "../ir.ts";
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
					? `    weights = (${algorithm.weights.values.join(", ")},)
    total = 0

    for index, weight in enumerate(weights):
        total += (ord(base[index]) - 48) * weight`
					: `    total = 0
    weight = len(base) + 1

    for char in base:
        total += (ord(char) - 48) * weight
        weight -= 1`;

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
        if ord(digits[position]) - 48 != check_digit_${entry.symbol}(digits[:position]):
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
 * Renders a charset as the body of a regex character class, every code point written as a
 * `\uXXXX` escape so that no character can be read as a class metacharacter or a range.
 *
 * @param {string|string[]} names - The charset name, or the union of several.
 * @returns {string} The class body, without the brackets.
 */
/**
 * Renders one code point as a regex escape.
 *
 * @param {number} code - The code point.
 * @returns {string} The escape sequence.
 */
const escapeCodePoint = (code: number): string => {
	const hex = code.toString(16);

	return code > 0xff_ff ? `\\U${hex.padStart(8, "0")}` : `\\u${hex.padStart(4, "0")}`;
};

const regexClass = (names: string | string[]): string => {
	const { single, ranges } = resolveCharset(names);
	const points = single.map((code) => escapeCodePoint(code));
	const spans = ranges.map(([from, to]) => `${escapeCodePoint(from)}-${escapeCodePoint(to)}`);

	return [...points, ...spans].join("");
};

/**
 * The regex a `guard-shape` step becomes, with one capture group per digit run so that the
 * digits come straight out of the match instead of being filtered out of the string again.
 *
 * @param {Step} step - The guard-shape step.
 * @returns {string} The regex source.
 */
const shapeRegex = (step: Extract<Step, { op: "guard-shape" }>): string => {
	const edge = step.trim === undefined ? "" : `[${regexClass(step.trim)}]*`;
	const separator = step.separators === undefined ? "" : `[${regexClass(step.separators)}]*`;
	const digits = `[${regexClass("ascii-digits")}]`;
	const groups = step.groups.map((size) => `(${digits}{${size}})`).join(separator);

	// `\Z` rather than `$`: Python's `$` also matches before a trailing newline.
	return `\\A${edge}${groups}${edge}\\Z`;
};

/**
 * Whether the profile is the common "match a shape, then keep the digits" shape, which
 * collapses into a single regex.
 *
 * @param {PlannedFunction} planned - The planned function.
 * @returns {boolean} True when the fast path applies.
 */
const hasShapeFastPath = (planned: PlannedFunction): boolean => {
	const steps = expandPipeline(planned.profile);

	return (
		steps.some((step) => step.op === "guard-shape") &&
		steps.some((step) => step.op === "sanitize" && step.keep === "ascii-digits")
	);
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
	const constant = `_${naming.snake(planned.spec.id).toUpperCase()}`;

	switch (step.op) {
		case "guard-shape": {
			return `    match = ${constant}_SHAPE.match(raw)

    if match is None:
        return ${bail}

    digits = "".join(match.groups())`;
		}
		case "guard-charset": {
			return `    if ${constant}_ALLOWED.match(raw) is None:
        return ${bail}`;
		}
		case "sanitize": {
			// Already bound by the shape guard's capture groups.
			if (hasShapeFastPath(planned)) return "";

			return `    digits = _NON_DIGITS.sub("", raw)`;
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
		.filter((rendered) => rendered !== "")
		.join("\n");
	const tail = tailOf(spec, planned);
	const constant = `_${naming.snake(spec.id).toUpperCase()}`;
	const constants = expandPipeline(planned.profile)
		.map((step) => {
			if (step.op === "guard-shape")
				return `${constant}_SHAPE = re.compile(${escapeLiteral(shapeRegex(step))})\n`;

			if (step.op === "guard-charset") {
				const allowed = escapeLiteral(`\\A[${regexClass(step.allow)}]*\\Z`);

				return `${constant}_ALLOWED = re.compile(${allowed})\n`;
			}

			return "";
		})
		.join("");

	return `${constants}
def ${planned.name}(${parameters}) -> ${returnType}:
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
		const typing = source.includes("Optional[str]") ? "from typing import Optional\n" : "";
		const regexImport = source.includes("re.compile") ? "import re\n" : "";
		const nonDigitsPattern = escapeLiteral(`[^${regexClass("ascii-digits")}]`);
		const nonDigits = source.includes("_NON_DIGITS")
			? `_NON_DIGITS = re.compile(${nonDigitsPattern})\n\n`
			: "";
		const importedSymbols = symbols.map((symbol) => `    ${symbol},`).join("\n");
		const runtimeImport =
			symbols.length === 0 ? "" : `from _spec_runtime import (\n${importedSymbols}\n)\n`;

		files[path] = `# Code generated from spec/utilities by spec/codegen. DO NOT EDIT.
"""${functions.map((planned) => planned.spec.summary).join(" ")}"""

${regexImport}${typing}${runtimeImport}

${nonDigits}${source}
`;
	}

	return files;
};
