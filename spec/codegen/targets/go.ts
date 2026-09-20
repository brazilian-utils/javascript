/**
 * Go emitter: one package per module, exported names in Go's style, and a `specruntime`
 * package holding the shared helpers.
 */
import { type Step, type UtilitySpec } from "../ir.ts";
import { type Plan, type PlannedFunction, expandPipeline, naming } from "../plan.ts";

/**
 * Renders a string as a Go interpreted string literal.
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
		else if (code > 0xff_ff) literal += `\\U${code.toString(16).padStart(8, "0")}`;
		else if (code < 0x20 || code > 0x7e) literal += `\\u${code.toString(16).padStart(4, "0")}`;
		else literal += char;
	}

	return `${literal}"`;
};

/**
 * Converts an id to the exported name Go uses for it.
 *
 * @param {string} name - The id to convert.
 * @returns {string} The Go name.
 */
const goName = (name: string): string => naming.pascal(name);

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
		...ranges.map(
			([from, to]) => `(code >= 0x${from.toString(16)} && code <= 0x${to.toString(16)})`,
		),
	].join(" ||\n\t\t");
};

/** The part of the prelude that does not depend on the specs. */
const RUNTIME_HELPERS = `// TrimBy strips the leading and trailing characters that belong to the set.
func TrimBy(value string, inSet func(rune) bool) string {
	return strings.TrimFunc(value, inSet)
}

// KeepBy keeps only the characters that belong to the set.
func KeepBy(value string, inSet func(rune) bool) string {
	var kept strings.Builder

	for _, char := range value {
		if inSet(char) {
			kept.WriteRune(char)
		}
	}

	return kept.String()
}

// MatchShape reports whether the value is exactly the digit groups, optionally separated.
func MatchShape(value string, groups []int, inSeparator func(rune) bool) bool {
	runes := []rune(value)
	index := 0

	for position, size := range groups {
		if position > 0 && inSeparator != nil {
			for index < len(runes) && inSeparator(runes[index]) {
				index++
			}
		}

		for digit := 0; digit < size; digit++ {
			if index >= len(runes) || !IsAsciiDigits(runes[index]) {
				return false
			}

			index++
		}
	}

	return index == len(runes)
}

// IsRepeated reports whether the value is a non empty run of one repeated character.
func IsRepeated(value string) bool {
	if value == "" {
		return false
	}

	return value == strings.Repeat(value[:1], len(value))
}

// ApplyPattern lays the value over the pattern: '0' copies, '*' hides, anything else separates.
func ApplyPattern(value string, pattern string, pad bool) string {
	padded := value

	if pad {
		slots := 0

		for _, char := range pattern {
			if char == '0' || char == '*' {
				slots++
			}
		}

		if len(padded) < slots {
			padded = strings.Repeat("0", slots-len(padded)) + padded
		}
	}

	var formatted strings.Builder
	index := 0

	for _, char := range pattern {
		if char == '0' || char == '*' {
			if index >= len(padded) {
				break
			}

			if char == '*' {
				formatted.WriteString("*")
			} else {
				formatted.WriteByte(padded[index])
			}

			index++
		} else if index < len(padded) {
			formatted.WriteRune(char)
		}
	}

	return formatted.String()
}`;

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
			) => `// Is${goName(charset.name)} reports whether the code point belongs to the ${charset.name} set.
func Is${goName(charset.name)}(code rune) bool {
	return ${charsetTest(plan, charset.name)}
}`,
		)
		.join("\n\n");

	const algorithms = plan.algorithms
		.map((entry) => {
			const { algorithm } = entry;
			const body =
				algorithm.weights.kind === "fixed"
					? `	weights := []int{${algorithm.weights.values.join(", ")}}
	sum := 0

	for index, weight := range weights {
		sum += int(base[index]-'0') * weight
	}`
					: `	sum := 0
	weight := len(base) + 1

	for index := 0; index < len(base); index++ {
		sum += int(base[index]-'0') * weight
		weight--
	}`;

			return `// CheckDigit${goName(entry.name)} computes one check digit of the base.
//
// ${algorithm.description}
//
// Official source: ${algorithm.source}
func CheckDigit${goName(entry.name)}(base string) int {
${body}

	digit := ${algorithm.modulus} - (sum % ${algorithm.modulus})

	if digit >= ${algorithm.clamp.atLeast} {
		return ${algorithm.clamp.to}
	}

	return digit
}

// Verify${goName(entry.name)} reports whether every check digit matches its base.
func Verify${goName(entry.name)}(digits string) bool {
	for _, position := range []int{${algorithm.positions.join(", ")}} {
		if len(digits) <= position {
			return false
		}

		if int(digits[position]-'0') != CheckDigit${goName(entry.name)}(digits[:position]) {
			return false
		}
	}

	return true
}`;
		})
		.join("\n\n");

	return `// Code generated from spec/utilities by spec/codegen. DO NOT EDIT.

// Package specruntime holds the helpers shared by the generated utilities.
package specruntime

import "strings"

${charsets}

${RUNTIME_HELPERS}

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
	if (spec.kind === "validator") return "false";

	return planned.nullable ? '"", false' : '""';
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
			const value =
				step.trim === undefined
					? "raw"
					: `specruntime.TrimBy(raw, specruntime.Is${goName(step.trim)})`;
			const separators =
				step.separators === undefined ? "nil" : `specruntime.Is${goName(step.separators)}`;

			return `	if !specruntime.MatchShape(${value}, []int{${step.groups.join(", ")}}, ${separators}) {
		return ${bail}
	}`;
		}
		case "guard-charset": {
			return `	for _, char := range raw {
		if !(${step.allow.map((name) => `specruntime.Is${goName(name)}(char)`).join(" || ")}) {
			return ${bail}
		}
	}`;
		}
		case "sanitize": {
			return `	digits := specruntime.KeepBy(raw, specruntime.Is${goName(step.keep)})`;
		}
		case "guard-length": {
			return `	if len(digits) != ${step.equals} {
		return ${bail}
	}`;
		}
		case "guard-repeated": {
			return `	if specruntime.IsRepeated(digits) {
		return ${bail}
	}`;
		}
		case "verify-check-digits": {
			return `	if !specruntime.Verify${goName(step.checkDigit)}(digits) {
		return ${bail}
	}`;
		}
		case "apply-pattern": {
			const pattern =
				step.variants?.["obfuscate"] !== undefined && planned.options.includes("obfuscate")
					? `map[bool]string{true: ${escapeLiteral(step.variants["obfuscate"])}, false: ${escapeLiteral(step.pattern)}}[obfuscate]`
					: escapeLiteral(step.pattern);
			const pad = planned.options.includes("pad") ? "pad" : "false";

			const secondReturn = planned.nullable ? ", true" : "";

			return `	return specruntime.ApplyPattern(digits, ${pattern}, ${pad})${secondReturn}`;
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

	return planned.nullable ? "(string, bool)" : "string";
};

/**
 * What closes the generated body: the success value, or nothing when a step already returned.
 *
 * @param {UtilitySpec} spec - The utility being emitted.
 * @param {PlannedFunction} planned - The planned function.
 * @returns {string} The closing lines, which may be empty.
 */
const tailOf = (spec: UtilitySpec, planned: PlannedFunction): string => {
	if (spec.kind === "validator") return "\n\n	return true";

	const returnsEarly = expandPipeline(planned.profile).some((step) => step.op === "apply-pattern");

	return returnsEarly ? "" : `\n\n	return digits`;
};

/**
 * Renders one planned function, documentation included.
 *
 * @param {PlannedFunction} planned - The function to render.
 * @returns {string} The rendered source.
 */
const renderFunction = (planned: PlannedFunction): string => {
	const { spec } = planned;
	const returns = returnTypeOf(spec, planned);
	const parameters = [
		`${naming.camel(spec.input.name)} string`,
		...planned.options.map((option) => `${option} bool`),
	].join(", ");

	const head = `	raw := ${naming.camel(spec.input.name)}`;
	const body = expandPipeline(planned.profile)
		.map((step) => renderStep(step, spec, planned))
		.join("\n");
	const tail = tailOf(spec, planned);

	return `// ${planned.name} ${spec.summary}
//
// Profile: ${planned.profileName} — ${planned.profile.description}
//
${spec.sources.map((source) => `// ${source.role === "official" ? "Official" : "Based on"}: ${source.url}`).join("\n")}
func ${planned.name}(${parameters}) ${returns} {
${head}

${body}${tail}
}`;
};

/**
 * Emits every file of this target.
 *
 * @param {Plan} plan - The emission plan.
 * @returns {Record<string, string>} The files, by path relative to the target directory.
 */
export const emit = (plan: Plan): Record<string, string> => {
	const files: Record<string, string> = {
		"specruntime/specruntime.go": prelude(plan),
		"go.mod": "module brazilianutils/spec\n\ngo 1.24\n",
	};
	const modules = new Map<string, PlannedFunction[]>();

	for (const planned of plan.functions) {
		modules.set(planned.module, [...(modules.get(planned.module) ?? []), planned]);
	}

	for (const [module, functions] of modules) {
		const source = functions.map((planned) => renderFunction(planned)).join("\n\n");

		files[`${module}/${module}.go`] =
			`// Code generated from spec/utilities by spec/codegen. DO NOT EDIT.

// Package ${module} holds the generated ${module} utilities.
package ${module}

import "brazilianutils/spec/specruntime"

${source}
`;
	}

	return files;
};
