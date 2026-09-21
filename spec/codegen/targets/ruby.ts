/**
 * Ruby emitter: module functions under `BrazilianUtils::*Utils`, keeping the `valid?`
 * predicate name and the `nil` returning formatter the gem already exposes.
 */
import { type Step, type UtilitySpec, resolveCharset } from "../ir.ts";
import { type Plan, type PlannedFunction, expandPipeline, naming } from "../plan.ts";

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

	return code > 0xff_ff ? `\\u{${hex}}` : `\\u${hex.padStart(4, "0")}`;
};

const regexClass = (names: string | string[]): string => {
	const { single, ranges } = resolveCharset(names);
	const points = single.map((code) => escapeCodePoint(code));
	const spans = ranges.map(([from, to]) => `${escapeCodePoint(from)}-${escapeCodePoint(to)}`);

	return [...points, ...spans].join("");
};

/**
 * The regex a `guard-shape` step becomes, with one capture group per digit run.
 *
 * @param {Step} step - The guard-shape step.
 * @returns {string} The regex source.
 */
const shapeRegex = (step: Extract<Step, { op: "guard-shape" }>): string => {
	const edge = step.trim === undefined ? "" : `[${regexClass(step.trim)}]*`;
	const separator = step.separators === undefined ? "" : `[${regexClass(step.separators)}]*`;
	const digits = `[${regexClass("ascii-digits")}]`;
	const groups = step.groups.map((size) => `(${digits}{${size}})`).join(separator);

	// `\A`/`\z` rather than `^`/`$`: in Ruby those are line anchors.
	return `\\A${edge}${groups}${edge}\\z`;
};

/**
 * Whether the profile matches a shape and then keeps the digits, which collapses into one regex.
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
 * The prefix of the module level constants belonging to one function.
 *
 * @param {PlannedFunction} planned - The planned function.
 * @returns {string} The constant prefix.
 */
const constantPrefix = (planned: PlannedFunction): string =>
	naming.snake(planned.spec.id).toUpperCase();

/**
 * Renders a string as a Ruby double quoted literal, where `#` also has to be escaped because
 * `#{...}` would interpolate.
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
		else if (char === "#") literal += String.raw`\#`;
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
			([from, to]) => `(code >= 0x${from.toString(16)} && code <= 0x${to.toString(16)})`,
		),
	].join(" ||\n        ");
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
			(charset) => `    # Whether the code point belongs to the ${charset.name} set.
    def self.${charset.symbol}?(code)
      ${charsetTest(plan, charset.name)}
    end`,
		)
		.join("\n\n");

	const algorithms = plan.algorithms
		.map((entry) => {
			const { algorithm } = entry;
			const body =
				algorithm.weights.kind === "fixed"
					? `      weights = [${algorithm.weights.values.join(", ")}]
      total = 0
      index = 0

      while index < weights.length
        total += (base.getbyte(index) - 48) * weights[index]
        index += 1
      end`
					: `      total = 0
      index = 0
      weight = base.length + 1

      while index < base.length
        total += (base.getbyte(index) - 48) * weight
        weight -= 1
        index += 1
      end`;

			return `    # ${algorithm.description}
    #
    # Official source: ${algorithm.source}
    def self.check_digit_${entry.symbol}(base)
${body}
      digit = ${algorithm.modulus} - (total % ${algorithm.modulus})

      digit >= ${algorithm.clamp.atLeast} ? ${algorithm.clamp.to} : digit
    end

    # Whether every check digit of the value matches its base.
    def self.verify_${entry.symbol}(digits)
${algorithm.positions
	.map(
		(position) => `      return false if digits.length <= ${position}
      return false unless (digits.getbyte(${position}) - 48) == check_digit_${entry.symbol}(digits[0...${position}])`,
	)
	.join("\n\n")}

      true
    end`;
		})
		.join("\n\n");

	return `# frozen_string_literal: true

# Code generated from spec/utilities by spec/codegen. DO NOT EDIT.

module BrazilianUtils
  # Helpers shared by the generated utilities.
  module SpecRuntime
${charsets}

    # Strips the leading and trailing characters that belong to the set.
    def self.trim_by(value, in_set)
      chars = value.chars
      start = 0
      last = chars.length

      start += 1 while start < last && in_set.call(chars[start].ord)
      last -= 1 while last > start && in_set.call(chars[last - 1].ord)

      chars[start...last].join
    end

    # Keeps only the characters that belong to the set.
    def self.keep_by(value, in_set)
      value.chars.select { |char| in_set.call(char.ord) }.join
    end

    # Whether the value is exactly the digit groups, optionally separated.
    def self.match_shape(value, groups, in_separator = nil)
      chars = value.chars
      index = 0

      groups.each_with_index do |size, position|
        if position.positive? && !in_separator.nil?
          index += 1 while index < chars.length && in_separator.call(chars[index].ord)
        end

        size.times do
          return false if index >= chars.length || !ascii_digits?(chars[index].ord)

          index += 1
        end
      end

      index == chars.length
    end

    # Whether the value is a non empty run of one repeated character.
    def self.is_repeated(value)
      !value.empty? && value == value[0] * value.length
    end

    # Lays the value over the pattern: "0" copies, "*" hides, anything else separates.
    def self.apply_pattern(value, pattern, pad)
      padded = value

      if pad
        slots = pattern.chars.count { |char| ['0', '*'].include?(char) }
        padded = value.rjust(slots, '0')
      end

      formatted = +''
      index = 0

      pattern.each_char do |char|
        if ['0', '*'].include?(char)
          break if index >= padded.length

          formatted << (char == '*' ? '*' : padded[index])
          index += 1
        elsif index < padded.length
          formatted << char
        end
      end

      formatted
    end

${algorithms}
  end
end
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

	return planned.nullable ? "nil" : "''";
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
	const runtime = "BrazilianUtils::SpecRuntime";

	const constant = constantPrefix(planned);

	switch (step.op) {
		case "guard-shape": {
			return `      match = ${constant}_SHAPE.match(raw)
      return ${bail} if match.nil?

      digits = match.captures.join`;
		}
		case "guard-charset": {
			return `      return ${bail} if ${constant}_ALLOWED.match(raw).nil?`;
		}
		case "sanitize": {
			// Already bound by the shape guard's capture groups.
			if (hasShapeFastPath(planned)) return "";

			return `      digits = raw.gsub(NON_DIGITS, '')`;
		}
		case "guard-length": {
			return `      return ${bail} unless digits.length == ${step.equals}`;
		}
		case "guard-repeated": {
			return `      return ${bail} if ${runtime}.is_repeated(digits)`;
		}
		case "verify-check-digits": {
			return `      return ${bail} unless ${runtime}.verify_${naming.snake(step.checkDigit)}(digits)`;
		}
		case "apply-pattern": {
			const pattern =
				step.variants?.["obfuscate"] !== undefined && planned.options.includes("obfuscate")
					? `obfuscate ? ${escapeLiteral(step.variants["obfuscate"])} : ${escapeLiteral(step.pattern)}`
					: escapeLiteral(step.pattern);
			const pad = planned.options.includes("pad") ? "pad" : "false";

			return `      ${runtime}.apply_pattern(digits, ${pattern}, ${pad})`;
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
	if (spec.kind === "validator") return "\n\n      true";

	const returnsEarly = expandPipeline(planned.profile).some((step) => step.op === "apply-pattern");

	return returnsEarly ? "" : "\n\n      digits";
};

/**
 * Renders one planned function, documentation included.
 *
 * @param {PlannedFunction} planned - The function to render.
 * @returns {string} The rendered source.
 */
const renderFunction = (planned: PlannedFunction): string => {
	const { spec } = planned;
	const parameters = [
		naming.snake(spec.input.name),
		...planned.options.map((option) => `${option} = false`),
	].join(", ");

	const absent = planned.nullable ? "nil" : "''";
	const head =
		spec.kind === "validator"
			? `      return false unless ${naming.snake(spec.input.name)}.is_a?(String)

      raw = ${naming.snake(spec.input.name)}`
			: `      return ${absent} if ${naming.snake(spec.input.name)}.nil?

      raw = ${naming.snake(spec.input.name)}.to_s`;

	const body = expandPipeline(planned.profile)
		.map((step) => renderStep(step, spec, planned))
		.filter((rendered) => rendered !== "")
		.join("\n");
	const tail = tailOf(spec, planned);
	const constant = constantPrefix(planned);
	const constants = expandPipeline(planned.profile)
		.map((step) => {
			if (step.op === "guard-shape")
				return `    ${constant}_SHAPE = Regexp.new(${escapeLiteral(shapeRegex(step))}).freeze\n`;

			if (step.op === "guard-charset") {
				const allowed = escapeLiteral(`\\A[${regexClass(step.allow)}]*\\z`);

				return `    ${constant}_ALLOWED = Regexp.new(${allowed}).freeze\n`;
			}

			return "";
		})
		.join("");

	return `${constants}
    # ${spec.summary}
    #
    # Profile: ${planned.profileName} — ${planned.profile.description}
    #
${spec.sources.map((source) => `    # ${source.role === "official" ? "Official" : "Based on"}: ${source.url}`).join("\n")}
    def self.${planned.name}(${parameters})
${head}

${body}${tail}
    end`;
};

/**
 * Emits every file of this target.
 *
 * @param {Plan} plan - The emission plan.
 * @returns {Record<string, string>} The files, by path relative to the target directory.
 */
export const emit = (plan: Plan): Record<string, string> => {
	const files: Record<string, string> = { "brazilian-utils/spec_runtime.rb": prelude(plan) };
	const modules = new Map<string, PlannedFunction[]>();

	for (const planned of plan.functions) {
		modules.set(planned.module, [...(modules.get(planned.module) ?? []), planned]);
	}

	const nonDigitsPattern = escapeLiteral(`[^${regexClass("ascii-digits")}]`);

	for (const [module, functions] of modules) {
		const shortName = module.split("::").at(-1) ?? module;
		const fileName = shortName
			.replace(/Utils$/, "")
			.replaceAll(/([a-z])([A-Z])/g, "$1-$2")
			.toLowerCase();

		files[`brazilian-utils/${fileName}-utils.rb`] = `# frozen_string_literal: true

# Code generated from spec/utilities by spec/codegen. DO NOT EDIT.

require_relative 'spec_runtime'

module BrazilianUtils
  # ${functions.map((planned) => planned.spec.summary).join(" ")}
  module ${shortName}${
		functions.some(
			(planned) =>
				!hasShapeFastPath(planned) &&
				expandPipeline(planned.profile).some((step) => step.op === "sanitize"),
		)
			? `\n    NON_DIGITS = Regexp.new(${nonDigitsPattern}).freeze\n`
			: ""
	}
${functions.map((planned) => renderFunction(planned)).join("\n\n")}
  end
end
`;
	}

	return files;
};
