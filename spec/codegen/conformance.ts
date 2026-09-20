/**
 * Emits the conformance driver for each target: a standalone program that runs the generated
 * functions over the committed vectors and exits non zero on the first disagreement.
 *
 * The vectors are inlined into the driver rather than parsed at run time, so a target language
 * needs no JSON library and the check is literally the same in all six. Every output is
 * compared as a string: a validator's verdict as `"true"`/`"false"`, a formatter's absent value
 * as `"<none>"`.
 */
import { type Plan, type PlannedFunction } from "./plan.ts";
import { type Vectors } from "./vectors.ts";

const NONE = "<none>";

/**
 * Escapes a string into a target language literal.
 *
 * @param {string} value - The text to literal.
 * @param {Function} unicode - Renders one non printable or non ASCII code point.
 * @param {Record<string, string>} [extra] - Characters the language escapes on top of `"` and `\`.
 * @returns {string} The literal, quotes included.
 */
const escapeWith = (
	value: string,
	unicode: (code: number) => string,
	extra: Record<string, string> = {},
): string => {
	let literal = '"';

	for (const char of value) {
		const code = char.codePointAt(0) ?? 0;

		if (Object.hasOwn(extra, char)) literal += extra[char];
		else if (char === '"') literal += String.raw`\"`;
		else if (char === "\\") literal += String.raw`\\`;
		else if (code < 0x20 || code > 0x7e) literal += unicode(code);
		else literal += char;
	}

	return `${literal}"`;
};

/**
 * The control characters Java spells with their own literal: a `\uXXXX` literal is expanded
 * before lexing, so `\u000a` would end the literal on a real line break.
 */
const JAVA_CONTROL: Record<number, string> = {
	0x08: String.raw`\b`,
	0x09: String.raw`\t`,
	0x0a: String.raw`\n`,
	0x0c: String.raw`\f`,
	0x0d: String.raw`\r`,
};

const utf16 = (code: number): string => {
	if (code < 0x20) return JAVA_CONTROL[code] ?? `\\${code.toString(8).padStart(3, "0")}`;
	if (code <= 0xff_ff) return `\\u${code.toString(16).padStart(4, "0")}`;

	const offset = code - 0x1_00_00;

	return `\\u${(0xd8_00 + (offset >> 10)).toString(16).padStart(4, "0")}\\u${(0xdc_00 + (offset & 0x3_ff)).toString(16).padStart(4, "0")}`;
};

const braced = (code: number): string => `\\u{${code.toString(16)}}`;
const padded8 = (code: number): string => `\\U${code.toString(16).padStart(8, "0")}`;
const padded4 = (code: number): string =>
	code > 0xff_ff ? padded8(code) : `\\u${code.toString(16).padStart(4, "0")}`;

const escapers: Record<string, (value: string) => string> = {
	typescript: (value) => escapeWith(value, braced),
	python: (value) => escapeWith(value, padded8),
	go: (value) => escapeWith(value, padded4),
	ruby: (value) => escapeWith(value, braced, { "#": String.raw`\#` }),
	rust: (value) => escapeWith(value, braced),
	java: (value) => escapeWith(value, utf16),
};

type Column = {
	planned: PlannedFunction;
	optionSet: Record<string, boolean | undefined>;
	label: string;
	expected: string[];
};

/**
 * One column per function and adopted option set, holding the expected output as strings.
 *
 * @param {Plan} plan - The emission plan of the target.
 * @param {Vectors} vectors - The committed conformance vectors.
 * @returns {Column[]} The columns the driver checks.
 */
const columnsFor = (plan: Plan, vectors: Vectors): Column[] => {
	const columns: Column[] = [];

	for (const planned of plan.functions) {
		const utility = vectors.utilities[planned.spec.id];
		const profile = utility.profiles[planned.profileName];

		if (planned.spec.kind === "validator") {
			columns.push({
				planned,
				optionSet: {},
				label: `${planned.module}.${planned.name}`,
				expected: (profile as boolean[]).map((value) => (value ? "true" : "false")),
			});
			continue;
		}

		for (const [index, optionSet] of utility.optionSets.entries()) {
			const unsupported = Object.keys(optionSet).some(
				(option) => !planned.options.includes(option),
			);

			if (unsupported) continue;

			columns.push({
				planned,
				optionSet,
				label: `${planned.module}.${planned.name}(${JSON.stringify(optionSet)})`,
				expected: (profile as (string | null)[][]).map((outputs) => outputs[index] ?? NONE),
			});
		}
	}

	return columns;
};

const flags = (column: Column, trueLiteral: string, falseLiteral: string): string[] =>
	column.planned.options.map((option) =>
		(column.optionSet[option] ?? false) ? trueLiteral : falseLiteral,
	);

const argumentList = (column: Column, trueLiteral: string, falseLiteral: string): string => {
	const rest = flags(column, trueLiteral, falseLiteral);

	return rest.length > 0 ? `, ${rest.join(", ")}` : "";
};

/** What every driver emitter needs: the vectors, already rendered as literals of its language. */
type DriverContext = {
	plan: Plan;
	literal: (value: string) => string;
	columns: Column[];
	inputs: string;
	modules: string[];
	expectedList: (column: Column) => string;
};

/**
 * Emits the typescript conformance driver.
 *
 * @param {DriverContext} context - The vectors and helpers, rendered for typescript.
 * @returns {Record<string, string>} The driver file, by path.
 */
const emitTypescriptDriver = (context: DriverContext): Record<string, string> => {
	const { plan, literal, columns, inputs, modules, expectedList } = context;

	return {
		"conformance.ts": `// Code generated from spec/vectors by spec/codegen. DO NOT EDIT.
${modules
	.map(
		(module) =>
			`import { ${plan.functions
				.filter((planned) => planned.module === module)
				.map((planned) => planned.name)
				.join(", ")} } from "./${module}/${module}.ts";`,
	)
	.join("\n")}

const inputs: string[] = [${inputs}];

const columns: { label: string; run: (value: string) => string; expected: string[] }[] = [
${columns
	.map((column) => {
		const fields = column.planned.options
			.map((option) => `${option}: ${String(column.optionSet[option] ?? false)}`)
			.join(", ");
		const options = column.planned.options.length > 0 ? `, { ${fields} }` : "";
		const call = `${column.planned.name}(value${options})`;
		const run =
			column.planned.spec.kind === "validator" ? `String(${call})` : `${call} ?? "${NONE}"`;

		return `	{ label: ${literal(column.label)}, run: (value: string): string => ${run}, expected: [${expectedList(column)}] },`;
	})
	.join("\n")}
];

let failures = 0;
let checked = 0;

for (const column of columns) {
	for (const [index, value] of inputs.entries()) {
		const actual = column.run(value);

		checked++;

		if (actual !== column.expected[index]) {
		failures++;

		if (failures <= 10)
			console.error(
				\`FAIL \${column.label} input=\${JSON.stringify(value)} expected=\${JSON.stringify(column.expected[index])} actual=\${JSON.stringify(actual)}\`,
			);
		}
	}
}

console.log(\`typescript: \${checked - failures}/\${checked} conformance checks passed\`);
process.exit(failures === 0 ? 0 : 1);
`,
	};
};

/**
 * Emits the python conformance driver.
 *
 * @param {DriverContext} context - The vectors and helpers, rendered for python.
 * @returns {Record<string, string>} The driver file, by path.
 */
const emitPythonDriver = (context: DriverContext): Record<string, string> => {
	const { literal, columns, inputs, modules, expectedList } = context;

	return {
		"conformance.py": `# Code generated from spec/vectors by spec/codegen. DO NOT EDIT.
"""Runs the generated Python utilities against the committed conformance vectors."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

${modules.map((module) => `import ${module}`).join("\n")}

INPUTS = [${inputs}]

COLUMNS = [
${columns
	.map((column) => {
		const call = `${column.planned.module}.${column.planned.name}(value${argumentList(column, "True", "False")})`;
		const run =
			column.planned.spec.kind === "validator"
				? `"true" if ${call} else "false"`
				: `(${call} if ${call} is not None else "${NONE}")`;

		return `    (${literal(column.label)}, lambda value: ${run}, [${expectedList(column)}]),`;
	})
	.join("\n")}
]

failures = 0
checked = 0

for label, run, expected in COLUMNS:
    for index, value in enumerate(INPUTS):
        actual = run(value)
        checked += 1

        if actual != expected[index]:
            failures += 1

            if failures <= 10:
                print(
                    f"FAIL {label} input={value!r} expected={expected[index]!r} actual={actual!r}",
                    file=sys.stderr,
                )

print(f"python: {checked - failures}/{checked} conformance checks passed")
sys.exit(0 if failures == 0 else 1)
`,
	};
};

/**
 * Emits the go conformance driver.
 *
 * @param {DriverContext} context - The vectors and helpers, rendered for go.
 * @returns {Record<string, string>} The driver file, by path.
 */
const emitGoDriver = (context: DriverContext): Record<string, string> => {
	const { literal, columns, inputs, modules, expectedList } = context;

	return {
		"conformance/main.go": `// Code generated from spec/vectors by spec/codegen. DO NOT EDIT.

package main

import (
	"fmt"
	"os"
	"strconv"

${modules.map((module) => `\t"brazilianutils/spec/${module}"`).join("\n")}
)

type column struct {
	label    string
	run      func(string) string
	expected []string
}

func main() {
	inputs := []string{${inputs}}

	columns := []column{
${columns
	.map((column) => {
		const call = `${column.planned.module}.${column.planned.name}(value${argumentList(column, "true", "false")})`;
		const run = column.planned.spec.kind === "validator" ? `strconv.FormatBool(${call})` : call;

		return `\t\t{label: ${literal(column.label)}, run: func(value string) string { return ${run} }, expected: []string{${expectedList(column)}}},`;
	})
	.join("\n")}
	}

	failures := 0
	checked := 0

	for _, current := range columns {
		for index, value := range inputs {
		actual := current.run(value)
		checked++

		if actual != current.expected[index] {
			failures++

			if failures <= 10 {
				fmt.Fprintf(os.Stderr, "FAIL %s input=%q expected=%q actual=%q\\n", current.label, value, current.expected[index], actual)
			}
		}
		}
	}

	fmt.Printf("go: %d/%d conformance checks passed\\n", checked-failures, checked)

	if failures > 0 {
		os.Exit(1)
	}
}
`,
	};
};

/**
 * Emits the ruby conformance driver.
 *
 * @param {DriverContext} context - The vectors and helpers, rendered for ruby.
 * @returns {Record<string, string>} The driver file, by path.
 */
const emitRubyDriver = (context: DriverContext): Record<string, string> => {
	const { literal, columns, inputs, modules, expectedList } = context;

	return {
		"conformance.rb": `# frozen_string_literal: true

# Code generated from spec/vectors by spec/codegen. DO NOT EDIT.

${modules
	.map((module) => {
		const short = (module.split("::").at(-1) ?? module).replace(/Utils$/, "").toLowerCase();

		return `require_relative 'brazilian-utils/${short}-utils'`;
	})
	.join("\n")}

INPUTS = [${inputs}].freeze

COLUMNS = [
${columns
	.map((column) => {
		const call = `${column.planned.module}.${column.planned.name}(value${argumentList(column, "true", "false")})`;
		const run = column.planned.spec.kind === "validator" ? `${call}.to_s` : `${call} || '${NONE}'`;

		return `  [${literal(column.label)}, ->(value) { ${run} }, [${expectedList(column)}]],`;
	})
	.join("\n")}
].freeze

failures = 0
checked = 0

COLUMNS.each do |label, run, expected|
  INPUTS.each_with_index do |value, index|
    actual = run.call(value)
    checked += 1

    next if actual == expected[index]

    failures += 1
    warn "FAIL #{label} input=#{value.inspect} expected=#{expected[index].inspect} actual=#{actual.inspect}" if failures <= 10
  end
end

puts "ruby: #{checked - failures}/#{checked} conformance checks passed"
exit(failures.zero? ? 0 : 1)
`,
	};
};

/**
 * Emits the rust conformance driver.
 *
 * @param {DriverContext} context - The vectors and helpers, rendered for rust.
 * @returns {Record<string, string>} The driver file, by path.
 */
const emitRustDriver = (context: DriverContext): Record<string, string> => {
	const { literal, columns, inputs, modules, expectedList } = context;

	return {
		"conformance.rs": `// Code generated from spec/vectors by spec/codegen. DO NOT EDIT.

//! Runs the generated Rust utilities against the committed conformance vectors.

mod spec_runtime;
${modules.map((module) => `mod ${module};`).join("\n")}

fn main() {
    let inputs: Vec<&str> = vec![${inputs}];

    let columns: Vec<(&str, fn(&str) -> String, Vec<&str>)> = vec![
${columns
	.map((column) => {
		const call = `${column.planned.module}::${column.planned.name}(value${argumentList(column, "true", "false")})`;
		const formatted = column.planned.nullable
			? `${call}.unwrap_or_else(|| "${NONE}".to_string())`
			: call;
		const run = column.planned.spec.kind === "validator" ? `${call}.to_string()` : formatted;

		return `        (${literal(column.label)}, (|value: &str| ${run}) as fn(&str) -> String, vec![${expectedList(column)}]),`;
	})
	.join("\n")}
    ];

    let mut failures = 0;
    let mut checked = 0;

    for (label, run, expected) in &columns {
        for (index, value) in inputs.iter().enumerate() {
            let actual = run(value);

            checked += 1;

            if actual != expected[index] {
                failures += 1;

                if failures <= 10 {
                    eprintln!(
                        "FAIL {} input={:?} expected={:?} actual={:?}",
                        label, value, expected[index], actual
                    );
                }
            }
        }
    }

    println!("rust: {}/{} conformance checks passed", checked - failures, checked);

    if failures > 0 {
        std::process::exit(1);
    }
}
`,
	};
};

/**
 * Emits the java conformance driver.
 *
 * @param {DriverContext} context - The vectors and helpers, rendered for java.
 * @returns {Record<string, string>} The driver file, by path.
 */
const emitJavaDriver = (context: DriverContext): Record<string, string> => {
	const { literal, columns, inputs, expectedList } = context;

	return {
		"Conformance.java": `// Code generated from spec/vectors by spec/codegen. DO NOT EDIT.

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;

/** Runs the generated Java utilities against the committed conformance vectors. */
public final class Conformance {
    private Conformance() {}

    private static final String[] INPUTS = {${inputs}};

${columns
	.map(
		(column, index) =>
			`    private static final String[] EXPECTED_${index} = {${expectedList(column)}};`,
	)
	.join("\n")}

    private record Column(String label, Function<String, String> run, String[] expected) {}

    public static void main(String[] args) {
        List<Column> columns = new ArrayList<>();

${columns
	.map((column, index) => {
		const call = `${column.planned.module}.${column.planned.name}(value${argumentList(column, "true", "false")})`;
		const run =
			column.planned.spec.kind === "validator"
				? `String.valueOf(${call})`
				: `${call} == null ? "${NONE}" : ${call}`;

		return `        columns.add(new Column(${literal(column.label)}, value -> ${run}, EXPECTED_${index}));`;
	})
	.join("\n")}

        int failures = 0;
        int checked = 0;

        for (Column column : columns) {
            for (int index = 0; index < INPUTS.length; index++) {
                String actual = column.run().apply(INPUTS[index]);

                checked++;

                if (!Objects.equals(actual, column.expected()[index])) {
                    failures++;

                    if (failures <= 10) {
                        System.err.printf(
                            "FAIL %s input=%s expected=%s actual=%s%n",
                            column.label(), INPUTS[index], column.expected()[index], actual);
                    }
                }
            }
        }

        System.out.printf("java: %d/%d conformance checks passed%n", checked - failures, checked);

        if (failures > 0) {
            System.exit(1);
        }
    }
}
`,
	};
};

const drivers: Record<string, (context: DriverContext) => Record<string, string>> = {
	typescript: emitTypescriptDriver,
	python: emitPythonDriver,
	go: emitGoDriver,
	ruby: emitRubyDriver,
	rust: emitRustDriver,
	java: emitJavaDriver,
};

/**
 * Emits the conformance driver of one target.
 *
 * @param {Plan} plan - The emission plan of the target.
 * @param {Vectors} vectors - The committed conformance vectors.
 * @returns {Record<string, string>} The driver file, by path.
 */
export const emitConformance = (plan: Plan, vectors: Vectors): Record<string, string> => {
	const driver = drivers[plan.target];

	if (driver === undefined) throw new Error(`no conformance driver for ${plan.target}`);

	const literal = escapers[plan.target];
	const columns = columnsFor(plan, vectors);

	return driver({
		plan,
		literal,
		columns,
		inputs: vectors.corpus.map((input) => literal(input)).join(", "),
		modules: [...new Set(plan.functions.map((planned) => planned.module))],
		expectedList: (column) => column.expected.map((value) => literal(value)).join(", "),
	});
};
