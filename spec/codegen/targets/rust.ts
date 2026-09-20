/**
 * Rust emitter: one module per document, `&str` in, `bool`/`Option<String>` out, matching the
 * signatures the crate already publishes.
 */
import { type Step, type UtilitySpec } from "../ir.ts";
import { type Plan, type PlannedFunction, expandPipeline, naming } from "../plan.ts";

/**
 * Renders a string as a Rust literal.
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
	const found = plan.charsets.find((charset) => charset.name === name);
	const { single, ranges } = found?.ranges ?? { single: [], ranges: [] };

	return [
		...single.map((code) => `code == 0x${code.toString(16)}`),
		...ranges.map(
			([from, to]) => `(0x${from.toString(16)}..=0x${to.toString(16)}).contains(&code)`,
		),
	].join("\n        || ");
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
			(charset) => `/// Whether the code point belongs to the ${charset.name} set.
pub fn is_${charset.symbol}(code: u32) -> bool {
    ${charsetTest(plan, charset.name)}
}`,
		)
		.join("\n\n");

	const algorithms = plan.algorithms
		.map((entry) => {
			const { algorithm } = entry;
			const body =
				algorithm.weights.kind === "fixed"
					? `    const WEIGHTS: [u32; ${algorithm.weights.values.length}] = [${algorithm.weights.values.join(", ")}];

    let sum: u32 = base
        .bytes()
        .zip(WEIGHTS.iter())
        .map(|(byte, weight)| u32::from(byte - b'0') * weight)
        .sum();`
					: `    let length = base.len() as u32;
    let sum: u32 = base
        .bytes()
        .enumerate()
        .map(|(index, byte)| u32::from(byte - b'0') * (length + 1 - index as u32))
        .sum();`;

			return `/// ${algorithm.description}
///
/// Official source: ${algorithm.source}
pub fn check_digit_${entry.symbol}(base: &str) -> u32 {
${body}

    let digit = ${algorithm.modulus} - (sum % ${algorithm.modulus});

    if digit >= ${algorithm.clamp.atLeast} {
        ${algorithm.clamp.to}
    } else {
        digit
    }
}

/// Whether every check digit of the value matches its base.
pub fn verify_${entry.symbol}(digits: &str) -> bool {
    [${algorithm.positions.join(", ")}].iter().all(|&position: &usize| {
        digits.len() > position
            && u32::from(digits.as_bytes()[position] - b'0')
                == check_digit_${entry.symbol}(&digits[..position])
    })
}`;
		})
		.join("\n\n");

	return `// Code generated from spec/utilities by spec/codegen. DO NOT EDIT.

//! Helpers shared by the generated utilities.

${charsets}

/// Strips the leading and trailing characters that belong to the set.
pub fn trim_by(value: &str, in_set: fn(u32) -> bool) -> &str {
    value.trim_matches(|char: char| in_set(char as u32))
}

/// Keeps only the characters that belong to the set.
pub fn keep_by(value: &str, in_set: fn(u32) -> bool) -> String {
    value.chars().filter(|char| in_set(*char as u32)).collect()
}

/// Whether the value is exactly the digit groups, optionally separated.
pub fn match_shape(value: &str, groups: &[usize], in_separator: Option<fn(u32) -> bool>) -> bool {
    let chars: Vec<char> = value.chars().collect();
    let mut index = 0;

    for (position, size) in groups.iter().enumerate() {
        if position > 0 {
            if let Some(separator) = in_separator {
                while index < chars.len() && separator(chars[index] as u32) {
                    index += 1;
                }
            }
        }

        for _ in 0..*size {
            if index >= chars.len() || !is_ascii_digits(chars[index] as u32) {
                return false;
            }

            index += 1;
        }
    }

    index == chars.len()
}

/// Whether the value is a non empty run of one repeated character.
pub fn is_repeated(value: &str) -> bool {
    match value.chars().next() {
        None => false,
        Some(first) => value.chars().all(|char| char == first),
    }
}

/// Lays the value over the pattern: '0' copies, '*' hides, anything else separates.
pub fn apply_pattern(value: &str, pattern: &str, pad: bool) -> String {
    let slots = pattern.chars().filter(|char| *char == '0' || *char == '*').count();
    let padded = if pad && value.chars().count() < slots {
        format!("{}{}", "0".repeat(slots - value.chars().count()), value)
    } else {
        value.to_string()
    };

    let source: Vec<char> = padded.chars().collect();
    let mut formatted = String::new();
    let mut index = 0;

    for char in pattern.chars() {
        if char == '0' || char == '*' {
            if index >= source.len() {
                break;
            }

            formatted.push(if char == '*' { '*' } else { source[index] });
            index += 1;
        } else if index < source.len() {
            formatted.push(char);
        }
    }

    formatted
}

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

	return planned.nullable ? "None" : "String::new()";
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
					: `spec_runtime::trim_by(raw, spec_runtime::is_${naming.snake(step.trim)})`;
			const separators =
				step.separators === undefined
					? "None"
					: `Some(spec_runtime::is_${naming.snake(step.separators)} as fn(u32) -> bool)`;

			return `    if !spec_runtime::match_shape(${value}, &[${step.groups.join(", ")}], ${separators}) {
        return ${bail};
    }`;
		}
		case "guard-charset": {
			return `    for char in raw.chars() {
        let code = char as u32;

        if !(${step.allow.map((name) => `spec_runtime::is_${naming.snake(name)}(code)`).join(" || ")}) {
            return ${bail};
        }
    }`;
		}
		case "sanitize": {
			return `    let digits = spec_runtime::keep_by(raw, spec_runtime::is_${naming.snake(step.keep)});`;
		}
		case "guard-length": {
			return `    if digits.len() != ${step.equals} {
        return ${bail};
    }`;
		}
		case "guard-repeated": {
			return `    if spec_runtime::is_repeated(&digits) {
        return ${bail};
    }`;
		}
		case "verify-check-digits": {
			return `    if !spec_runtime::verify_${naming.snake(step.checkDigit)}(&digits) {
        return ${bail};
    }`;
		}
		case "apply-pattern": {
			const pattern =
				step.variants?.["obfuscate"] !== undefined && planned.options.includes("obfuscate")
					? `if obfuscate { ${escapeLiteral(step.variants["obfuscate"])} } else { ${escapeLiteral(step.pattern)} }`
					: escapeLiteral(step.pattern);
			const pad = planned.options.includes("pad") ? "pad" : "false";
			const call = `spec_runtime::apply_pattern(&digits, ${pattern}, ${pad})`;
			const wrapped = planned.nullable ? `Some(${call})` : call;

			return `    ${wrapped}`;
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

	return planned.nullable ? "Option<String>" : "String";
};

/**
 * What closes the generated body: the success value, or nothing when a step already returned.
 *
 * @param {UtilitySpec} spec - The utility being emitted.
 * @param {PlannedFunction} planned - The planned function.
 * @returns {string} The closing lines, which may be empty.
 */
const tailOf = (spec: UtilitySpec, planned: PlannedFunction): string => {
	if (spec.kind === "validator") return "\n\n    true";

	const returnsEarly = expandPipeline(planned.profile).some((step) => step.op === "apply-pattern");

	return returnsEarly ? "" : "\n\n    digits";
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
		`${naming.snake(spec.input.name)}: &str`,
		...planned.options.map((option) => `${option}: bool`),
	].join(", ");

	// Rust's type system already rejects the non string inputs the dynamic targets guard against.
	const head = `    let raw = ${naming.snake(spec.input.name)};`;
	const body = expandPipeline(planned.profile)
		.map((step) => renderStep(step, spec, planned))
		.join("\n");
	const tail = tailOf(spec, planned);

	return `/// ${spec.summary}
///
/// Profile: ${planned.profileName} — ${planned.profile.description}
///
${spec.sources.map((source) => `/// ${source.role === "official" ? "Official" : "Based on"}: ${source.url}`).join("\n")}
pub fn ${planned.name}(${parameters}) -> ${returns} {
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
	const files: Record<string, string> = { "spec_runtime.rs": prelude(plan) };
	const modules = new Map<string, PlannedFunction[]>();

	for (const planned of plan.functions) {
		modules.set(planned.module, [...(modules.get(planned.module) ?? []), planned]);
	}

	for (const [module, functions] of modules) {
		files[`${module}.rs`] = `// Code generated from spec/utilities by spec/codegen. DO NOT EDIT.

//! ${functions.map((planned) => planned.spec.summary).join(" ")}

use crate::spec_runtime;

${functions.map((planned) => renderFunction(planned)).join("\n\n")}
`;
	}

	files["lib.rs"] = `// Code generated from spec/utilities by spec/codegen. DO NOT EDIT.

//! Generated Brazilian Utils, emitted from the language neutral specs.

pub mod spec_runtime;
${[...modules.keys()].map((module) => `pub mod ${module};`).join("\n")}
`;

	return files;
};
