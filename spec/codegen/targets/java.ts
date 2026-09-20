/**
 * Java emitter: the target with no existing package, kept here to show what onboarding a new
 * language costs once the specs exist — a file of roughly 120 lines of emitter, no new
 * algorithm work, and the canonical profile from day one.
 */
import { type Step, type UtilitySpec } from "../ir.ts";
import { type Plan, type PlannedFunction, expandPipeline, naming } from "../plan.ts";

/**
 * Renders a string as a Java literal.
 *
 * A `\\uXXXX` escape is expanded by the compiler before lexing, so `\\u000a` would end the
 * literal on a real line break: every control character goes out as its own escape, and an
 * astral code point as its UTF-16 surrogate pair.
 *
 * @param {string} value - The text to render.
 * @returns {string} The literal, quotes included.
 */
const JAVA_CONTROL: Record<number, string> = {
	0x08: "\\b",
	0x09: "\\t",
	0x0a: "\\n",
	0x0c: "\\f",
	0x0d: "\\r",
};

const escapeLiteral = (value: string): string => {
	let literal = '"';

	for (const char of value) {
		const code = char.codePointAt(0) ?? 0;

		if (char === '"') literal += String.raw`\"`;
		else if (char === "\\") literal += String.raw`\\`;
		else if (code < 0x20) literal += JAVA_CONTROL[code] ?? `\\${code.toString(8).padStart(3, "0")}`;
		else if (code > 0xff_ff) {
			const offset = code - 0x1_00_00;

			literal += `\\u${(0xd8_00 + (offset >> 10)).toString(16).padStart(4, "0")}`;
			literal += `\\u${(0xdc_00 + (offset & 0x3_ff)).toString(16).padStart(4, "0")}`;
		} else if (code > 0x7e) literal += `\\u${code.toString(16).padStart(4, "0")}`;
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
		...ranges.map(
			([from, to]) => `(code >= 0x${from.toString(16)} && code <= 0x${to.toString(16)})`,
		),
	].join("\n            || ");
};

/** The part of the prelude that does not depend on the specs. */
const RUNTIME_HELPERS = `    /** Strips the leading and trailing characters that belong to the set. */
    public static String trimBy(String value, IntPredicate inSet) {
        int start = 0;
        int end = value.length();

        while (start < end && inSet.test(value.charAt(start))) {
            start++;
        }
        while (end > start && inSet.test(value.charAt(end - 1))) {
            end--;
        }

        return value.substring(start, end);
    }

    /** Keeps only the characters that belong to the set. */
    public static String keepBy(String value, IntPredicate inSet) {
        StringBuilder kept = new StringBuilder();

        for (int index = 0; index < value.length(); index++) {
            if (inSet.test(value.charAt(index))) {
                kept.append(value.charAt(index));
            }
        }

        return kept.toString();
    }

    /** Whether the value is exactly the digit groups, optionally separated. */
    public static boolean matchShape(String value, int[] groups, IntPredicate inSeparator) {
        int index = 0;

        for (int position = 0; position < groups.length; position++) {
            if (position > 0 && inSeparator != null) {
                while (index < value.length() && inSeparator.test(value.charAt(index))) {
                    index++;
                }
            }

            for (int digit = 0; digit < groups[position]; digit++) {
                if (index >= value.length() || !isAsciiDigits(value.charAt(index))) {
                    return false;
                }

                index++;
            }
        }

        return index == value.length();
    }

    /** Whether the value is a non empty run of one repeated character. */
    public static boolean isRepeated(String value) {
        if (value.isEmpty()) {
            return false;
        }

        for (int index = 1; index < value.length(); index++) {
            if (value.charAt(index) != value.charAt(0)) {
                return false;
            }
        }

        return true;
    }

    /** Lays the value over the pattern: '0' copies, '*' hides, anything else separates. */
    public static String applyPattern(String value, String pattern, boolean pad) {
        String padded = value;

        if (pad) {
            int slots = 0;

            for (int index = 0; index < pattern.length(); index++) {
                char current = pattern.charAt(index);

                if (current == '0' || current == '*') {
                    slots++;
                }
            }

            while (padded.length() < slots) {
                padded = "0" + padded;
            }
        }

        StringBuilder formatted = new StringBuilder();
        int index = 0;

        for (int position = 0; position < pattern.length(); position++) {
            char current = pattern.charAt(position);

            if (current == '0' || current == '*') {
                if (index >= padded.length()) {
                    break;
                }

                formatted.append(current == '*' ? '*' : padded.charAt(index));
                index++;
            } else if (index < padded.length()) {
                formatted.append(current);
            }
        }

        return formatted.toString();
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
			(charset) => `    /** Whether the code point belongs to the ${charset.name} set. */
    public static boolean is${naming.pascal(charset.name)}(int code) {
        return ${charsetTest(plan, charset.name)};
    }`,
		)
		.join("\n\n");

	const algorithms = plan.algorithms
		.map((entry) => {
			const { algorithm } = entry;
			const body =
				algorithm.weights.kind === "fixed"
					? `        int[] weights = {${algorithm.weights.values.join(", ")}};
        int sum = 0;

        for (int index = 0; index < weights.length; index++) {
            sum += (base.charAt(index) - '0') * weights[index];
        }`
					: `        int sum = 0;
        int weight = base.length() + 1;

        for (int index = 0; index < base.length(); index++) {
            sum += (base.charAt(index) - '0') * weight;
            weight--;
        }`;

			return `    /**
     * ${algorithm.description}
     *
     * <p>Official source: ${algorithm.source}
     */
    public static int checkDigit${naming.pascal(entry.name)}(String base) {
${body}

        int digit = ${algorithm.modulus} - (sum % ${algorithm.modulus});

        return digit >= ${algorithm.clamp.atLeast} ? ${algorithm.clamp.to} : digit;
    }

    /** Whether every check digit of the value matches its base. */
    public static boolean verify${naming.pascal(entry.name)}(String digits) {
        for (int position : new int[] {${algorithm.positions.join(", ")}}) {
            if (digits.length() <= position) {
                return false;
            }

            if (digits.charAt(position) - '0' != checkDigit${naming.pascal(entry.name)}(digits.substring(0, position))) {
                return false;
            }
        }

        return true;
    }`;
		})
		.join("\n\n");

	return `// Code generated from spec/utilities by spec/codegen. DO NOT EDIT.

import java.util.function.IntPredicate;

/** Helpers shared by the generated utilities. */
public final class SpecRuntime {
    private SpecRuntime() {}

${charsets}

${RUNTIME_HELPERS}

${algorithms}
}
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

	return planned.nullable ? "null" : '""';
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
					: `SpecRuntime.trimBy(raw, SpecRuntime::is${naming.pascal(step.trim)})`;
			const separators =
				step.separators === undefined ? "null" : `SpecRuntime::is${naming.pascal(step.separators)}`;

			return `        if (!SpecRuntime.matchShape(${value}, new int[] {${step.groups.join(", ")}}, ${separators})) {
            return ${bail};
        }`;
		}
		case "guard-charset": {
			return `        for (int index = 0; index < raw.length(); index++) {
            int code = raw.charAt(index);

            if (!(${step.allow.map((name) => `SpecRuntime.is${naming.pascal(name)}(code)`).join(" || ")})) {
                return ${bail};
            }
        }`;
		}
		case "sanitize": {
			return `        String digits = SpecRuntime.keepBy(raw, SpecRuntime::is${naming.pascal(step.keep)});`;
		}
		case "guard-length": {
			return `        if (digits.length() != ${step.equals}) {
            return ${bail};
        }`;
		}
		case "guard-repeated": {
			return `        if (SpecRuntime.isRepeated(digits)) {
            return ${bail};
        }`;
		}
		case "verify-check-digits": {
			return `        if (!SpecRuntime.verify${naming.pascal(step.checkDigit)}(digits)) {
            return ${bail};
        }`;
		}
		case "apply-pattern": {
			const pattern =
				step.variants?.["obfuscate"] !== undefined && planned.options.includes("obfuscate")
					? `obfuscate ? ${escapeLiteral(step.variants["obfuscate"])} : ${escapeLiteral(step.pattern)}`
					: escapeLiteral(step.pattern);
			const pad = planned.options.includes("pad") ? "pad" : "false";

			return `        return SpecRuntime.applyPattern(digits, ${pattern}, ${pad});`;
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
 * What closes the generated body: the success value, or nothing when a step already returned.
 *
 * @param {UtilitySpec} spec - The utility being emitted.
 * @param {PlannedFunction} planned - The planned function.
 * @returns {string} The closing lines, which may be empty.
 */
const tailOf = (spec: UtilitySpec, planned: PlannedFunction): string => {
	if (spec.kind === "validator") return "\n\n        return true;";

	const returnsEarly = expandPipeline(planned.profile).some((step) => step.op === "apply-pattern");

	return returnsEarly ? "" : "\n\n        return digits;";
};

/**
 * Renders one planned function, documentation included.
 *
 * @param {PlannedFunction} planned - The function to render.
 * @returns {string} The rendered source.
 */
const renderFunction = (planned: PlannedFunction): string => {
	const { spec } = planned;
	const returns = spec.kind === "validator" ? "boolean" : "String";
	const parameters = [
		`String ${naming.camel(spec.input.name)}`,
		...planned.options.map((option) => `boolean ${option}`),
	].join(", ");

	const head = `        if (${naming.camel(spec.input.name)} == null) {
            return ${bailValue(spec, planned)};
        }

        String raw = ${naming.camel(spec.input.name)};`;

	const body = expandPipeline(planned.profile)
		.map((step) => renderStep(step, spec, planned))
		.join("\n");
	const tail = tailOf(spec, planned);

	const overload =
		planned.options.length > 0
			? `
    /** ${spec.summary} Uses the default options. */
    public static ${returns} ${planned.name}(String ${naming.camel(spec.input.name)}) {
        return ${planned.name}(${[naming.camel(spec.input.name), ...planned.options.map(() => "false")].join(", ")});
    }
`
			: "";

	return `${overload}
    /**
     * ${spec.summary}
     *
     * <p>Profile: ${planned.profileName} — ${planned.profile.description}
     *
${spec.sources.map((source) => `     * <p>${source.role === "official" ? "Official" : "Based on"}: ${source.url}`).join("\n")}
     */
    public static ${returns} ${planned.name}(${parameters}) {
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
	const files: Record<string, string> = { "SpecRuntime.java": prelude(plan) };
	const modules = new Map<string, PlannedFunction[]>();

	for (const planned of plan.functions) {
		modules.set(planned.module, [...(modules.get(planned.module) ?? []), planned]);
	}

	for (const [module, functions] of modules) {
		files[`${module}.java`] = `// Code generated from spec/utilities by spec/codegen. DO NOT EDIT.

/** ${functions.map((planned) => planned.spec.summary).join(" ")} */
public final class ${module} {
    private ${module}() {}
${functions.map((planned) => renderFunction(planned)).join("\n")}
}
`;
	}

	return files;
};
