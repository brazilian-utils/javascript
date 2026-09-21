/**
 * Writes the small program each target runs to replay the recorded tables.
 *
 * Every driver is generated from the compiled signature, so adding a utility adds rows to a
 * table and nothing to this file. A driver reads its table, rebuilds each call from the
 * columns, renders the answer the way `cases.ts` defines, and compares. Eight of them, one
 * per target plus the C ABI, all doing the same thing in their own idiom.
 *
 * The rendering is the contract: a boolean is `true`/`false`, a record is its fields joined by
 * `|`, a list is its length and then one rendered item per line, and a raised error is
 * `!Class|message`. One string comparison then covers every shape a utility can answer.
 *
 * Usage: `node spec/bridge/conformance/drivers.ts`
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { compileModule } from "../compiler/frontend.ts";
import { type FuncDecl, type Module, type Ty } from "../compiler/ir.ts";
import { pascal, snake } from "../compiler/kit.ts";
import { type Abi, abiOf } from "../compiler/targets/cabi.ts";
import { columnsOf, entryOf, loadRecorders, optionsOf } from "./cases.ts";

const bridge = resolve(import.meta.dirname, "..");

/** One positional argument, and the columns that carry it. */
type ArgPlan = { name: string; ty: Ty; at: number; kind: number; set: number };

/** One field of the options record, and the column that carries it. */
type OptPlan = { name: string; ty: Ty; at: number };

/** Everything a driver needs to know about one utility. */
type Plan = {
	module: Module;
	entry: FuncDecl;
	args: ArgPlan[];
	opts: OptPlan[];
	options: string;
	expect: number;
	abi: Abi | undefined;
};

/** Where a driver finds a table, relative to the directory it runs in. */
const tableOf = (plan: Plan): string => `../../conformance/recorded/${plan.module.name}.tsv`;

/** Reads the columns back into the shape a driver is written against. */
const planOf = (module: Module): Plan => {
	const entry = entryOf(module);
	const columns = columnsOf(module, entry);
	const args: ArgPlan[] = [];
	const opts: OptPlan[] = [];

	for (const [at, column] of columns.entries()) {
		if (column.k === "arg") args.push({ name: column.name, ty: column.ty, at, kind: -1, set: -1 });
		if (column.k === "kind") (args.at(-1) as ArgPlan).kind = at;
		if (column.k === "option") opts.push({ name: column.name, ty: column.ty, at });
	}

	// The `#set` column comes before the argument it belongs to, so it is matched by name.
	for (const [at, column] of columns.entries())
		if (column.k === "set") for (const arg of args) if (arg.name === column.name) arg.set = at;

	return {
		module,
		entry,
		args,
		opts,
		options: optionsOf(module, entry)?.name ?? "",
		expect: columns.length - 1,
		abi: abiOf(module, entry),
	};
};

/**
 * The five values a list-typed option can be given that are not a list at all.
 *
 * Only the three targets that still check at run time are ever handed one, and each spells
 * them in its own syntax, so the table is per target rather than shared.
 */
const NOT_A_LIST: Record<string, [string, string, string, string, string]> = {
	typescript: ["null", '"viacep"', "5", "{}", "true"],
	python: ["None", '"viacep"', "5", "{}", "True"],
	ruby: ["nil", "'viacep'", "5", "{}", "true"],
};

/** That table as a literal the target can read by token. */
const notAList = (target: string, open: string, close: string, arrow: string): string =>
	`${open}${["!null", "!string", "!number", "!object", "!boolean"]
		.map((token, index) => `"${token}"${arrow} ${NOT_A_LIST[target][index]}`)
		.join(", ")}${close}`;

/** The Go package, the Rust module and the Python module of a utility. */
const unit = (plan: Plan): string => snake(plan.module.name);

/** The Ruby module a utility's names live under. */
const namespaceOf = (plan: Plan): string => `BrazilianUtilsBridge::${pascal(plan.module.name)}`;

/** The Go spelling of a type, which is a pointer for every record. */
const goType = (plan: Plan, ty: Ty): string => {
	if (ty.k === "named") return `*${unit(plan)}.${ty.name}`;
	if (ty.k === "int") return "int64";
	if (ty.k === "bool") return "bool";

	return "string";
};

/** The Rust spelling of a type, always owned: the driver never borrows an answer. */
const rustType = (plan: Plan, ty: Ty): string => {
	if (ty.k === "named") return `${unit(plan)}::${ty.name}`;
	if (ty.k === "int") return "i64";
	if (ty.k === "bool") return "bool";

	return "String";
};

/** The Java spelling of a type. */
const javaType = (ty: Ty): string => {
	if (ty.k === "named") return ty.name;
	if (ty.k === "int") return "long";
	if (ty.k === "bool") return "boolean";

	return "String";
};

/** The C# spelling of a type. */
const csharpType = (ty: Ty): string => {
	if (ty.k === "named") return ty.name;
	if (ty.k === "int") return "long";
	if (ty.k === "bool") return "bool";

	return "string";
};

/** The name of the helper that renders one record, unique across modules. */
const helperName = (plan: Plan, name: string): string => `render${pascal(plan.module.name)}${name}`;

/** The name of the helper that renders a list of one element type. */
const listHelperName = (plan: Plan, of: Ty): string =>
	`renderList${pascal(plan.module.name)}${of.k === "named" ? of.name : pascal(of.k)}`;

/* ------------------------------------------------------------------ TypeScript */

const typescript = (plans: Plan[]): string => {
	const helpers = new Map<string, string>();

	const render = (plan: Plan, ty: Ty, value: string): string => {
		if (ty.k === "bool" || ty.k === "int") return `String(${value})`;
		if (ty.k === "opt") return `(${value} === undefined ? "~" : ${render(plan, ty.of, value)})`;

		if (ty.k === "named") {
			const struct = plan.module.structs.find((entry) => entry.name === ty.name);
			const name = helperName(plan, ty.name);

			helpers.set(
				name,
				`const ${name} = (value: ${ty.name}): string =>\n\t[${(struct?.fields ?? []).map((field) => render(plan, field.ty, `value.${field.name}`)).join(", ")}].join("|");`,
			);

			return `${name}(${value})`;
		}

		if (ty.k === "list") {
			const name = listHelperName(plan, ty.of);

			helpers.set(
				name,
				`const ${name} = (items: readonly unknown[]): string =>\n\t[String(items.length), ...items.map((item) => ${render(plan, ty.of, `(item as ${ty.of.k === "named" ? ty.of.name : "string"})`)})].join("\\n");`,
			);

			return `${name}(${value})`;
		}

		return value;
	};

	const checks = plans.map((plan) => {
		const argNames = plan.args.map((_, index) => `argument${index}`);
		const reads = plan.args
			.map((arg, index) => {
				const text = `unescape(parts[${arg.at}])`;
				const declared =
					arg.ty.k === "scalar" ? "string | number" : arg.ty.k === "enum" ? arg.ty.name : "string";
				const value = `(${
					arg.kind === -1 ? text : `parts[${arg.kind}] === "number" ? Number(${text}) : ${text}`
				}) as ${declared}`;

				return arg.set === -1
					? `\t\tconst ${argNames[index]} = ${value};`
					: `\t\tconst ${argNames[index]} = parts[${arg.set}] === "1" ? ${value} : undefined;`;
			})
			.join("\n");
		const options = plan.opts
			.map((option) => {
				const cell = `parts[${option.at}]`;
				const value =
					option.ty.k === "bool"
						? `${cell} === "1"`
						: option.ty.k === "list"
							? `${cell} in NOT_A_LIST ? NOT_A_LIST[${cell}] : ${cell} === "[]" ? [] : ${cell}.split("|")`
							: `Number(${cell})`;

				return `\t\tif (${cell} !== "") {\n\t\t\t(options as Record<string, unknown>)["${option.name}"] = ${value};\n\t\t\tgiven = true;\n\t\t}`;
			})
			.join("\n\n");
		const call = `${plan.entry.name}(${[
			...argNames,
			...(plan.options === "" ? [] : ["given ? options : undefined"]),
		].join(", ")})`;

		return `/** Replays what \`${plan.entry.name}\` answers. */
const check${pascal(plan.entry.name)} = async (): Promise<Tally> => {
	const table = readFileSync(resolve(import.meta.dirname, "${tableOf(plan)}"), "utf8");
	const tally: Tally = { passed: 0, failed: 0, skipped: 0 };

	for (const line of table.split("\\n").slice(1)) {
		if (line === "") continue;

		const parts = line.split("\\t");

		if (!runs(parts[0])) {
			tally.skipped++;

			continue;
		}

${reads}
${plan.options === "" ? "" : `\t\tconst options: ${plan.options} = {};\n\t\tlet given = false;\n\n${options}\n`}
		let actual: string;

		try {
			actual = ${render(plan, plan.entry.ret, `${plan.entry.blocking ? "await " : ""}${call}`)};
		} catch (error) {
			actual = \`!\${(error as Error).constructor.name}|\${(error as Error).message}\`;
		}

		report("${plan.entry.name}", parts, actual, unescape(parts[${plan.expect}]), tally);
	}

	return tally;
};`;
	});

	return `// Code generated by spec/bridge/conformance/drivers.ts. DO NOT EDIT.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

${plans
	.map((plan) => {
		const types = [
			...plan.module.structs.filter((entry) => entry.external !== true).map((entry) => entry.name),
			...plan.module.enums.map((entry) => entry.name),
		];

		return `import { ${[plan.entry.name, ...types.map((name) => `type ${name}`)].join(", ")} } from "./_bridge/${plan.module.name}.ts";`;
	})
	.join("\n")}

type Tally = { passed: number; failed: number; skipped: number };

const TARGET = "typescript";

const unescape = (value: string): string =>
	value.replaceAll("\\\\t", "\\t").replaceAll("\\\\n", "\\n").replaceAll("\\\\\\\\", "\\\\");

/** Whether this target can express the call a row describes. */
const runs = (targets: string): boolean => targets === "*" || targets.split("|").includes(TARGET);

/** The values a declared type does not allow, which only a run time check can still catch. */
const NOT_A_LIST: Record<string, unknown> = ${notAList("typescript", "{ ", " }", ":")};

const report = (fn: string, parts: string[], actual: string, expected: string, tally: Tally): void => {
	if (actual === expected) {
		tally.passed++;

		return;
	}

	tally.failed++;

	if (tally.failed <= 3)
		console.error(\`FAIL \${fn}(\${parts.slice(1, -1).join(", ")}) expected \${JSON.stringify(expected.slice(0, 120))} got \${JSON.stringify(actual.slice(0, 120))}\`);
};

${[...helpers.values()].join("\n\n")}

${checks.join("\n\n")}

let failed = 0;

const announce = (name: string, tally: Tally): void => {
	failed += tally.failed;

	console.log(
		\`\${TARGET}: \${name} \${tally.passed}/\${tally.passed + tally.failed} matched\${tally.skipped === 0 ? "" : \` (\${tally.skipped} not expressible)\`}\`,
	);
};

${plans.map((plan) => `announce("${plan.entry.name}", await check${pascal(plan.entry.name)}());`).join("\n")}

if (failed > 0) process.exit(1);
`;
};

/* ---------------------------------------------------------------------- Python */

const python = (plans: Plan[]): string => {
	const helpers = new Map<string, string>();

	const render = (plan: Plan, ty: Ty, value: string): string => {
		if (ty.k === "bool") return `("true" if ${value} else "false")`;
		if (ty.k === "int") return `str(${value})`;
		if (ty.k === "opt") return `("~" if ${value} is None else ${render(plan, ty.of, value)})`;

		if (ty.k === "named") {
			const name = helperName(plan, ty.name);
			const struct = plan.module.structs.find((entry) => entry.name === ty.name);

			helpers.set(
				name,
				`def ${name}(value):\n    return "|".join([${(struct?.fields ?? []).map((field) => render(plan, field.ty, `value.${snake(field.name)}`)).join(", ")}])`,
			);

			return `${name}(${value})`;
		}

		if (ty.k === "list") {
			const name = listHelperName(plan, ty.of);

			helpers.set(
				name,
				`def ${name}(items):\n    return "\\n".join([str(len(items))] + [${render(plan, ty.of, "item")} for item in items])`,
			);

			return `${name}(${value})`;
		}

		return value;
	};

	const checks = plans.map((plan) => {
		const argNames = plan.args.map((_, index) => `argument${index}`);
		const reads = plan.args
			.map((arg, index) => {
				const text = `unescape(parts[${arg.at}])`;
				const value =
					arg.kind === -1 ? text : `(int(${text}) if parts[${arg.kind}] == "number" else ${text})`;

				return arg.set === -1
					? `        ${argNames[index]} = ${value}`
					: `        ${argNames[index]} = ${value} if parts[${arg.set}] == "1" else None`;
			})
			.join("\n");
		const options = plan.opts
			.map((option) => {
				const cell = `parts[${option.at}]`;
				const value =
					option.ty.k === "bool"
						? `${cell} == "1"`
						: option.ty.k === "list"
							? `NOT_A_LIST[${cell}] if ${cell} in NOT_A_LIST else ([] if ${cell} == "[]" else ${cell}.split("|"))`
							: `int(${cell})`;

				return `        if ${cell} != "":\n            options.${snake(option.name)} = ${value}\n            given = True`;
			})
			.join("\n");
		const call = `bridge.${snake(plan.entry.name)}(${[...argNames, ...(plan.options === "" ? [] : ["options if given else None"])].join(", ")})`;

		return `def check_${snake(plan.entry.name)}():
    """Replays what \`${plan.entry.name}\` answers."""
    tally = [0, 0, 0]

    with open("${tableOf(plan)}", encoding="utf-8") as handle:
        rows = handle.read().split("\\n")[1:]

    for line in rows:
        if line == "":
            continue

        parts = line.split("\\t")

        if not runs(parts[0]):
            tally[2] += 1

            continue

${reads}
${plan.options === "" ? "" : `        options = bridge.${plan.options}()\n        given = False\n\n${options}\n`}
        try:
            actual = ${render(plan, plan.entry.ret, call)}
        except Exception as error:  # noqa: BLE001
            actual = "!" + type(error).__name__ + "|" + str(error)

        report("${plan.entry.name}", actual, unescape(parts[${plan.expect}]), tally)

    return tally`;
	});

	return `# Code generated by spec/bridge/conformance/drivers.ts. DO NOT EDIT.
"""Replays the recorded tables against the generated Python."""

import sys

import brutils_bridge as bridge

TARGET = "python"

NOT_A_LIST = ${notAList("python", "{", "}", ":")}


def unescape(value):
    """Reads back the three characters the table format escapes."""
    return value.replace("\\\\t", "\\t").replace("\\\\n", "\\n").replace("\\\\\\\\", "\\\\")


def runs(targets):
    """Whether this target can express the call a row describes."""
    return targets == "*" or TARGET in targets.split("|")


def report(fn, actual, expected, tally):
    """Counts one comparison, and shows the first few that disagree."""
    if actual == expected:
        tally[0] += 1

        return

    tally[1] += 1

    if tally[1] <= 3:
        print(f"FAIL {fn} expected {expected[:120]!r} got {actual[:120]!r}", file=sys.stderr)


${[...helpers.values()].join("\n\n\n")}


${checks.join("\n\n\n")}


FAILED = 0

${plans
	.map(
		(plan) => `TALLY = check_${snake(plan.entry.name)}()
FAILED += TALLY[1]
print(
    f"{TARGET}: ${plan.entry.name} {TALLY[0]}/{TALLY[0] + TALLY[1]} matched"
    + ("" if TALLY[2] == 0 else f" ({TALLY[2]} not expressible)")
)`,
	)
	.join("\n\n")}

if FAILED > 0:
    sys.exit(1)
`;
};

/* ------------------------------------------------------------------------ Ruby */

const ruby = (plans: Plan[]): string => {
	const helpers = new Map<string, string>();

	const render = (plan: Plan, ty: Ty, value: string): string => {
		if (ty.k === "bool") return `(${value} ? 'true' : 'false')`;
		if (ty.k === "int") return `${value}.to_s`;
		if (ty.k === "opt") return `(${value}.nil? ? '~' : ${render(plan, ty.of, value)})`;

		if (ty.k === "named") {
			const name = snake(helperName(plan, ty.name));
			const struct = plan.module.structs.find((entry) => entry.name === ty.name);

			helpers.set(
				name,
				`def ${name}(value)\n  [${(struct?.fields ?? []).map((field) => render(plan, field.ty, `value.${snake(field.name)}`)).join(", ")}].join('|')\nend`,
			);

			return `${name}(${value})`;
		}

		if (ty.k === "list") {
			const name = snake(listHelperName(plan, ty.of));

			helpers.set(
				name,
				`def ${name}(items)\n  ([items.length.to_s] + items.map { |item| ${render(plan, ty.of, "item")} }).join("\\n")\nend`,
			);

			return `${name}(${value})`;
		}

		return value;
	};

	const checks = plans.map((plan) => {
		const argNames = plan.args.map((_, index) => `argument#{""}${index}`.replace('#{""}', ""));
		const reads = plan.args
			.map((arg, index) => {
				const text = `unescape(parts[${arg.at}])`;
				const value =
					arg.kind === -1 ? text : `(parts[${arg.kind}] == 'number' ? ${text}.to_i : ${text})`;

				return arg.set === -1
					? `      ${argNames[index]} = ${value}`
					: `      ${argNames[index]} = parts[${arg.set}] == '1' ? ${value} : nil`;
			})
			.join("\n");
		const options = plan.opts
			.map((option) => {
				const cell = `parts[${option.at}]`;
				const value =
					option.ty.k === "bool"
						? `${cell} == '1'`
						: option.ty.k === "list"
							? `NOT_A_LIST.key?(${cell}) ? NOT_A_LIST[${cell}] : (${cell} == '[]' ? [] : ${cell}.split('|'))`
							: `${cell}.to_i`;

				return `      unless ${cell}.empty?\n        options.${snake(option.name)} = ${value}\n        given = true\n      end`;
			})
			.join("\n\n");
		const call = `${namespaceOf(plan)}.${snake(plan.entry.name)}(${[...argNames, ...(plan.options === "" ? [] : ["given ? options : nil"])].join(", ")})`;

		return `# Replays what \`${plan.entry.name}\` answers.
def check_${snake(plan.entry.name)}
  tally = [0, 0, 0]

  File.read('${tableOf(plan)}', encoding: 'UTF-8').split("\\n").drop(1).each do |line|
    next if line.empty?

    parts = line.split("\\t", -1)

    unless runs(parts[0])
      tally[2] += 1

      next
    end

${reads}
${plan.options === "" ? "" : `      options = ${namespaceOf(plan)}::${plan.options}.new\n      given = false\n\n${options}\n`}
    begin
      actual = ${render(plan, plan.entry.ret, call)}
    rescue StandardError => e
      actual = "!#{e.class.name.split('::').last}|#{e.message}"
    end

    report('${plan.entry.name}', actual, unescape(parts[${plan.expect}]), tally)
  end

  tally
end`;
	});

	return `# frozen_string_literal: true

# Code generated by spec/bridge/conformance/drivers.ts. DO NOT EDIT.

${plans.map((plan) => `require_relative 'lib/brazilian_utils_bridge/${snake(plan.module.name)}'`).join("\n")}

TARGET = 'ruby'

NOT_A_LIST = ${notAList("ruby", "{ ", " }", " =>")}.freeze

# Reads back the three characters the table format escapes.
def unescape(value)
  value.gsub('\\\\t', "\\t").gsub('\\\\n', "\\n").gsub('\\\\\\\\', '\\\\')
end

# Whether this target can express the call a row describes.
def runs(targets)
  targets == '*' || targets.split('|').include?(TARGET)
end

# Counts one comparison, and shows the first few that disagree.
def report(fn, actual, expected, tally)
  if actual == expected
    tally[0] += 1

    return
  end

  tally[1] += 1

  warn("FAIL #{fn} expected #{expected[0, 120].inspect} got #{actual[0, 120].inspect}") if tally[1] <= 3
end

${[...helpers.values()].join("\n\n")}

${checks.join("\n\n")}

failed = 0

${plans
	.map(
		(plan) => `tally = check_${snake(plan.entry.name)}
failed += tally[1]
puts("#{TARGET}: ${plan.entry.name} #{tally[0]}/#{tally[0] + tally[1]} matched" +
     (tally[2].zero? ? '' : " (#{tally[2]} not expressible)"))`,
	)
	.join("\n\n")}

exit(1) if failed.positive?
`;
};

/* -------------------------------------------------------------------------- Go */

const go = (plans: Plan[]): string => {
	const helpers = new Map<string, string>();
	const raises = plans.some((plan) => plan.entry.throws);

	const render = (plan: Plan, ty: Ty, value: string): string => {
		if (ty.k === "bool") return `strconv.FormatBool(${value})`;
		if (ty.k === "int") return `strconv.FormatInt(${value}, 10)`;

		if (ty.k === "named") {
			const name = helperName(plan, ty.name);
			const struct = plan.module.structs.find((entry) => entry.name === ty.name);

			helpers.set(
				name,
				`func ${name}(value ${goType(plan, ty)}) string {\n\treturn ${(struct?.fields ?? []).map((field) => render(plan, field.ty, `value.${pascal(field.name)}`)).join(' + "|" + ')}\n}`,
			);

			return `${name}(${value})`;
		}

		if (ty.k === "list") {
			const name = listHelperName(plan, ty.of);

			helpers.set(
				name,
				`func ${name}(items []${goType(plan, ty.of)}) string {\n\tout := strconv.Itoa(len(items))\n\n\tfor _, item := range items {\n\t\tout += "\\n" + ${render(plan, ty.of, "item")}\n\t}\n\n\treturn out\n}`,
			);

			return `${name}(${value})`;
		}

		return value;
	};

	const checks = plans.map((plan) => {
		const argNames = plan.args.map((_, index) => `argument${index}`);
		const reads = plan.args
			.map((arg, index) => {
				const text = `unescape(parts[${arg.at}])`;

				return arg.set === -1
					? `\t\t${argNames[index]} := ${text}`
					: `\t\tvar ${argNames[index]} *string\n\n\t\tif parts[${arg.set}] == "1" {\n\t\t\tgiven := ${text}\n\t\t\t${argNames[index]} = &given\n\t\t}`;
			})
			.join("\n\n");
		const options = plan.opts
			.map((option) => {
				const cell = `parts[${option.at}]`;
				const value =
					option.ty.k === "bool"
						? `${cell} == "1"`
						: option.ty.k === "list"
							? `${cell} == "[]" ? nil : strings.Split(${cell}, "|")`
							: `mustParse(${cell})`;
				const assign =
					option.ty.k === "list"
						? `\t\t\tnamed := []string{}\n\n\t\t\tif ${cell} != "[]" {\n\t\t\t\tnamed = strings.Split(${cell}, "|")\n\t\t\t}\n\n\t\t\toptions.${pascal(option.name)} = &named`
						: `\t\t\tvalue := ${value}\n\t\t\toptions.${pascal(option.name)} = &value`;

				return `\t\tif ${cell} != "" {\n${assign}\n\t\t\tgiven = true\n\t\t}`;
			})
			.join("\n\n");
		const call = `${unit(plan)}.${pascal(plan.entry.name)}(${[...argNames, ...(plan.options === "" ? [] : ["chosen"])].join(", ")})`;
		const body = plan.entry.throws
			? `\t\tfound, err := ${call}
		actual := ""

		if err == nil {
			actual = ${render(plan, plan.entry.ret, "found")}
		} else {
			kind := ""

			var raised *runtime.Error

			if errors.As(err, &raised) {
				kind = raised.Kind()
			}

			actual = "!" + kind + "|" + err.Error()
		}`
			: `\t\tactual := ${render(plan, plan.entry.ret, call)}`;

		return `// check${pascal(plan.entry.name)} replays what ${plan.entry.name} answers.
func check${pascal(plan.entry.name)}() tally {
	raw, err := os.ReadFile("${tableOf(plan)}")

	if err != nil {
		panic(err)
	}

	counts := tally{}

	for _, line := range strings.Split(strings.TrimRight(string(raw), "\\n"), "\\n")[1:] {
		if line == "" {
			continue
		}

		parts := strings.Split(line, "\\t")

		if !runs(parts[0]) {
			counts.skipped++

			continue
		}

${reads}
${
	plan.options === ""
		? ""
		: `\t\toptions := &${unit(plan)}.${plan.options}{}\n\t\tgiven := false\n\n${options}\n\n\t\tvar chosen *${unit(plan)}.${plan.options}\n\n\t\tif given {\n\t\t\tchosen = options\n\t\t}\n`
}
${body}

		report("${plan.entry.name}", actual, unescape(parts[${plan.expect}]), &counts)
	}

	return counts
}`;
	});

	return `// Code generated by spec/bridge/conformance/drivers.ts. DO NOT EDIT.

// Command conformance replays the recorded tables against the generated Go.
package main

import (
${[
	...(raises ? ['\t"errors"'] : []),
	'\t"fmt"',
	'\t"os"',
	'\t"strconv"',
	'\t"strings"',
	"",
	...plans.map((plan) => `\t"brazilianutils/bridge/${unit(plan)}"`),
	...(raises ? ['\t"brazilianutils/bridge/runtime"'] : []),
].join("\n")}
)

const target = "go"

type tally struct{ passed, failed, skipped int }

// unescape reads back the three characters the table format escapes.
func unescape(value string) string {
	value = strings.ReplaceAll(value, "\\\\t", "\\t")
	value = strings.ReplaceAll(value, "\\\\n", "\\n")

	return strings.ReplaceAll(value, "\\\\\\\\", "\\\\")
}

// runs reports whether this target can express the call a row describes.
func runs(targets string) bool {
	if targets == "*" {
		return true
	}

	for _, name := range strings.Split(targets, "|") {
		if name == target {
			return true
		}
	}

	return false
}

// mustParse reads a number the recorder wrote, which is never malformed.
func mustParse(value string) int64 {
	parsed, err := strconv.ParseInt(value, 10, 64)

	if err != nil {
		panic(err)
	}

	return parsed
}

// report counts one comparison, and shows the first few that disagree.
func report(fn string, actual string, expected string, counts *tally) {
	if actual == expected {
		counts.passed++

		return
	}

	counts.failed++

	if counts.failed <= 3 {
		fmt.Fprintf(os.Stderr, "FAIL %s expected %q got %q\\n", fn, cut(expected), cut(actual))
	}
}

// cut keeps a failure message readable when the answer is a five thousand row list.
func cut(value string) string {
	if len(value) <= 120 {
		return value
	}

	return value[:120]
}

${[...helpers.values()].join("\n\n")}

${checks.join("\n\n")}

func main() {
	failed := 0

${plans
	.map(
		(plan) => `\tcounts${pascal(plan.entry.name)} := check${pascal(plan.entry.name)}()
	failed += counts${pascal(plan.entry.name)}.failed

	fmt.Printf("%s: ${plan.entry.name} %d/%d matched%s\\n", target, counts${pascal(plan.entry.name)}.passed, counts${pascal(plan.entry.name)}.passed+counts${pascal(plan.entry.name)}.failed, note(counts${pascal(plan.entry.name)}.skipped))`,
	)
	.join("\n\n")}

	if failed > 0 {
		os.Exit(1)
	}
}

// note names how many rows this target could not be handed.
func note(skipped int) string {
	if skipped == 0 {
		return ""
	}

	return fmt.Sprintf(" (%d not expressible)", skipped)
}
`;
};

/* ------------------------------------------------------------------------ Rust */

const rust = (plans: Plan[]): string => {
	const helpers = new Map<string, string>();

	const render = (plan: Plan, ty: Ty, value: string): string => {
		if (ty.k === "bool" || ty.k === "int") return `${value}.to_string()`;

		if (ty.k === "named") {
			const name = snake(helperName(plan, ty.name));
			const struct = plan.module.structs.find((entry) => entry.name === ty.name);
			const fields = struct?.fields ?? [];

			helpers.set(
				name,
				`fn ${name}(value: &${rustType(plan, ty)}) -> String {\n    format!("${fields.map(() => "{}").join("|")}", ${fields.map((field) => render(plan, field.ty, `value.${snake(field.name)}`)).join(", ")})\n}`,
			);

			return `${name}(&${value})`;
		}

		if (ty.k === "list") {
			const name = snake(listHelperName(plan, ty.of));

			helpers.set(
				name,
				`fn ${name}(items: &[${rustType(plan, ty.of)}]) -> String {\n    let mut out = items.len().to_string();\n\n    for item in items {\n        out.push('\\n');\n        out.push_str(&${render(plan, ty.of, "item.clone()")});\n    }\n\n    out\n}`,
			);

			return `${name}(&${value})`;
		}

		return `${value}.to_string()`;
	};

	const checks = plans.map((plan) => {
		const argNames = plan.args.map((_, index) => `argument${index}`);
		const reads = plan.args
			.map((arg, index) => {
				const text = `unescape(parts[${arg.at}])`;

				return arg.set === -1
					? `        let ${argNames[index]} = ${text};`
					: `        let ${argNames[index]} = if parts[${arg.set}] == "1" { Some(${text}) } else { None };`;
			})
			.join("\n");
		const passed = plan.args.map((arg, index) =>
			arg.set === -1 ? `${argNames[index]}.as_str()` : `${argNames[index]}.as_deref()`,
		);
		const options = plan.opts
			.map((option) => {
				const cell = `parts[${option.at}]`;
				const value =
					option.ty.k === "bool"
						? `${cell} == "1"`
						: option.ty.k === "list"
							? `if ${cell} == "[]" { Vec::new() } else { ${cell}.split('|').map(str::to_string).collect() }`
							: `${cell}.parse().expect("a number")`;

				return `            if !${cell}.is_empty() {\n                options.${snake(option.name)} = Some(${value});\n                given = true;\n            }`;
			})
			.join("\n\n");
		const call = `${unit(plan)}::${snake(plan.entry.name)}(${[...passed, ...(plan.options === "" ? [] : ["if given { Some(&options) } else { None }"])].join(", ")})`;
		const body = plan.entry.throws
			? `        let actual = match ${call} {\n            Ok(found) => ${render(plan, plan.entry.ret, "found")},\n            Err(error) => format!("!{}|{}", error.kind(), error.message),\n        };`
			: `        let actual = ${render(plan, plan.entry.ret, call)};`;

		return `/// Replays what \`${plan.entry.name}\` answers.
fn check_${snake(plan.entry.name)}() -> Tally {
    let table = std::fs::read_to_string("${tableOf(plan)}").expect("the recorded table");
    let mut counts = Tally::default();

    for line in table.lines().skip(1) {
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split('\\t').collect();

        if !runs(parts[0]) {
            counts.skipped += 1;

            continue;
        }

${reads}
${plan.options === "" ? "" : `        let mut options = ${unit(plan)}::${plan.options}::default();\n        let mut given = false;\n\n${options}\n`}
${body}

        report("${plan.entry.name}", &actual, &unescape(parts[${plan.expect}]), &mut counts);
    }

    counts
}`;
	});

	return `// Code generated by spec/bridge/conformance/drivers.ts. DO NOT EDIT.
//
// Replays the recorded tables against the generated Rust.

${plans.map((plan) => `use brazilian_utils_bridge::${unit(plan)};`).join("\n")}

const TARGET: &str = "rust";

#[derive(Default)]
struct Tally {
    passed: usize,
    failed: usize,
    skipped: usize,
}

/// Reads back the three characters the table format escapes.
fn unescape(value: &str) -> String {
    value
        .replace("\\\\t", "\\t")
        .replace("\\\\n", "\\n")
        .replace("\\\\\\\\", "\\\\")
}

/// Whether this target can express the call a row describes.
fn runs(targets: &str) -> bool {
    targets == "*" || targets.split('|').any(|name| name == TARGET)
}

/// Counts one comparison, and shows the first few that disagree.
fn report(name: &str, actual: &str, expected: &str, counts: &mut Tally) {
    if actual == expected {
        counts.passed += 1;

        return;
    }

    counts.failed += 1;

    if counts.failed <= 3 {
        eprintln!(
            "FAIL {} expected {:?} got {:?}",
            name,
            &expected[..expected.len().min(120)],
            &actual[..actual.len().min(120)]
        );
    }
}

${[...helpers.values()].join("\n\n")}

${checks.join("\n\n")}

fn main() {
    let mut failed = 0;

${plans
	.map(
		(plan) => `    let counts = check_${snake(plan.entry.name)}();
    failed += counts.failed;
    println!(
        "{}: ${plan.entry.name} {}/{} matched{}",
        TARGET,
        counts.passed,
        counts.passed + counts.failed,
        if counts.skipped == 0 { String::new() } else { format!(" ({} not expressible)", counts.skipped) }
    );`,
	)
	.join("\n\n")}

    if failed > 0 {
        std::process::exit(1);
    }
}
`;
};

/* ------------------------------------------------------------------------ Java */

const java = (plans: Plan[]): string => {
	const helpers = new Map<string, string>();

	const render = (plan: Plan, ty: Ty, value: string): string => {
		if (ty.k === "bool" || ty.k === "int") return `String.valueOf(${value})`;

		if (ty.k === "named") {
			const name = helperName(plan, ty.name);
			const struct = plan.module.structs.find((entry) => entry.name === ty.name);

			helpers.set(
				name,
				`    private static String ${name}(${ty.name} value) {\n        return ${(struct?.fields ?? []).map((field) => render(plan, field.ty, `value.${field.name}`)).join(' + "|" + ')};\n    }`,
			);

			return `${name}(${value})`;
		}

		if (ty.k === "list") {
			const name = listHelperName(plan, ty.of);

			helpers.set(
				name,
				`    private static String ${name}(java.util.List<${javaType(ty.of)}> items) {\n        StringBuilder out = new StringBuilder(String.valueOf(items.size()));\n\n        for (${javaType(ty.of)} item : items) {\n            out.append("\\n").append(${render(plan, ty.of, "item")});\n        }\n\n        return out.toString();\n    }`,
			);

			return `${name}(${value})`;
		}

		return value;
	};

	const checks = plans.map((plan) => {
		const argNames = plan.args.map((_, index) => `argument${index}`);
		const reads = plan.args
			.map((arg, index) => {
				const text = `unescape(cells[${arg.at}])`;

				return arg.set === -1
					? `            String ${argNames[index]} = ${text};`
					: `            String ${argNames[index]} = cells[${arg.set}].equals("1") ? ${text} : null;`;
			})
			.join("\n");
		const options = plan.opts
			.map((option) => {
				const cell = `cells[${option.at}]`;
				const value =
					option.ty.k === "bool"
						? `${cell}.equals("1")`
						: option.ty.k === "list"
							? `${cell}.equals("[]") ? java.util.List.of() : java.util.List.of(${cell}.split("\\\\|", -1))`
							: `Long.parseLong(${cell})`;

				return `            if (!${cell}.isEmpty()) {\n                options.${option.name} = ${value};\n                given = true;\n            }`;
			})
			.join("\n\n");
		const call = `${pascal(plan.module.name)}.${plan.entry.name}(${[...argNames, ...(plan.options === "" ? [] : ["given ? options : null"])].join(", ")})`;
		const body = plan.entry.throws
			? `            String actual;\n\n            try {\n                actual = ${render(plan, plan.entry.ret, call)};\n            } catch (RuntimeException error) {\n                actual = "!" + error.getClass().getSimpleName() + "|" + error.getMessage();\n            }`
			: `            String actual = ${render(plan, plan.entry.ret, call)};`;

		return `    /** Replays what {@code ${plan.entry.name}} answers. */
    private static Tally check${pascal(plan.entry.name)}() throws java.io.IOException {
        Tally counts = new Tally();

        for (String line : Files.readString(Path.of("${tableOf(plan)}")).stripTrailing().split("\\n", -1)) {
            if (line.isEmpty() || line.startsWith("targets\\t")) {
                continue;
            }

            String[] cells = line.split("\\t", -1);

            if (!runs(cells[0])) {
                counts.skipped++;

                continue;
            }

${reads}
${plan.options === "" ? "" : `            ${plan.options} options = new ${plan.options}();\n            boolean given = false;\n\n${options}\n`}
${body}

            report("${plan.entry.name}", actual, unescape(cells[${plan.expect}]), counts);
        }

        return counts;
    }`;
	});

	return `// Code generated by spec/bridge/conformance/drivers.ts. DO NOT EDIT.

import java.nio.file.Files;
import java.nio.file.Path;

/** Replays the recorded tables against the generated Java. */
public final class Conformance {
    private static final String TARGET = "java";

    private Conformance() {}

    /** One utility's score. */
    private static final class Tally {
        private int passed;
        private int failed;
        private int skipped;
    }

    /** Reads back the three characters the table format escapes. */
    private static String unescape(String value) {
        return value.replace("\\\\t", "\\t").replace("\\\\n", "\\n").replace("\\\\\\\\", "\\\\");
    }

    /** Whether this target can express the call a row describes. */
    private static boolean runs(String targets) {
        if (targets.equals("*")) {
            return true;
        }

        for (String name : targets.split("\\\\|", -1)) {
            if (name.equals(TARGET)) {
                return true;
            }
        }

        return false;
    }

    /** Keeps a failure message readable when the answer is a five thousand row list. */
    private static String cut(String value) {
        return value.length() <= 120 ? value : value.substring(0, 120);
    }

    /** Counts one comparison, and shows the first few that disagree. */
    private static void report(String fn, String actual, String expected, Tally counts) {
        if (actual.equals(expected)) {
            counts.passed++;

            return;
        }

        counts.failed++;

        if (counts.failed <= 3) {
            System.err.printf("FAIL %s expected %s got %s%n", fn, cut(expected), cut(actual));
        }
    }

${[...helpers.values()].join("\n\n")}

${checks.join("\n\n")}

    public static void main(String[] args) throws java.io.IOException {
        int failed = 0;
        Tally counts;

${plans
	.map(
		(plan) => `        counts = check${pascal(plan.entry.name)}();
        failed += counts.failed;
        System.out.printf(
            "%s: ${plan.entry.name} %d/%d matched%s%n",
            TARGET,
            counts.passed,
            counts.passed + counts.failed,
            counts.skipped == 0 ? "" : String.format(" (%d not expressible)", counts.skipped));`,
	)
	.join("\n\n")}

        if (failed > 0) {
            System.exit(1);
        }
    }
}
`;
};

/* -------------------------------------------------------------------------- C# */

const csharp = (plans: Plan[]): string => {
	const helpers = new Map<string, string>();

	const render = (plan: Plan, ty: Ty, value: string): string => {
		if (ty.k === "bool") return `(${value} ? "true" : "false")`;
		if (ty.k === "int") return `${value}.ToString()`;

		if (ty.k === "named") {
			const name = helperName(plan, ty.name);
			const struct = plan.module.structs.find((entry) => entry.name === ty.name);

			helpers.set(
				name,
				`    private static string ${name}(${ty.name} value)\n    {\n        return ${(struct?.fields ?? []).map((field) => render(plan, field.ty, `value.${pascal(field.name)}`)).join(' + "|" + ')};\n    }`,
			);

			return `${name}(${value})`;
		}

		if (ty.k === "list") {
			const name = listHelperName(plan, ty.of);

			helpers.set(
				name,
				`    private static string ${name}(System.Collections.Generic.List<${csharpType(ty.of)}> items)\n    {\n        var out_ = new System.Text.StringBuilder(items.Count.ToString());\n\n        foreach (var item in items)\n        {\n            out_.Append("\\n").Append(${render(plan, ty.of, "item")});\n        }\n\n        return out_.ToString();\n    }`,
			);

			return `${name}(${value})`;
		}

		return value;
	};

	const checks = plans.map((plan) => {
		const argNames = plan.args.map((_, index) => `argument${index}`);
		const reads = plan.args
			.map((arg, index) => {
				const text = `Unescape(cells[${arg.at}])`;

				return arg.set === -1
					? `            var ${argNames[index]} = ${text};`
					: `            var ${argNames[index]} = cells[${arg.set}] == "1" ? ${text} : null;`;
			})
			.join("\n");
		const options = plan.opts
			.map((option) => {
				const cell = `cells[${option.at}]`;
				const value =
					option.ty.k === "bool"
						? `${cell} == "1"`
						: option.ty.k === "list"
							? `${cell} == "[]" ? new System.Collections.Generic.List<string>() : new System.Collections.Generic.List<string>(${cell}.Split('|'))`
							: `long.Parse(${cell})`;

				return `            if (${cell}.Length > 0)\n            {\n                options.${pascal(option.name)} = ${value};\n                given = true;\n            }`;
			})
			.join("\n\n");
		const call = `${plan.entry.blocking ? "await " : ""}${pascal(plan.module.name)}Utility.${pascal(plan.entry.name)}(${[...argNames, ...(plan.options === "" ? [] : ["given ? options : null"])].join(", ")})`;
		const body = plan.entry.throws
			? `            string actual;\n\n            try\n            {\n                actual = ${render(plan, plan.entry.ret, call)};\n            }\n            catch (Exception error)\n            {\n                actual = "!" + error.GetType().Name + "|" + error.Message;\n            }`
			: `            var actual = ${render(plan, plan.entry.ret, call)};`;

		// Only a utility that waits on something has anything to await; the rest would warn.
		return `    /// <summary>Replays what <c>${plan.entry.name}</c> answers.</summary>
    private static ${plan.entry.blocking ? "async " : ""}System.Threading.Tasks.Task<Tally> Check${pascal(plan.entry.name)}()
    {
        var counts = new Tally();

        foreach (var line in File.ReadAllText("${tableOf(plan)}").TrimEnd('\\n').Split('\\n'))
        {
            if (line.Length == 0 || line.StartsWith("targets\\t"))
            {
                continue;
            }

            var cells = line.Split('\\t');

            if (!Runs(cells[0]))
            {
                counts.Skipped++;

                continue;
            }

${reads}
${plan.options === "" ? "" : `            var options = new ${plan.options}();\n            var given = false;\n\n${options}\n`}
${body}

            Report("${plan.entry.name}", actual, Unescape(cells[${plan.expect}]), counts);
        }

        return ${plan.entry.blocking ? "counts" : "System.Threading.Tasks.Task.FromResult(counts)"};
    }`;
	});

	return `// Code generated by spec/bridge/conformance/drivers.ts. DO NOT EDIT.

using System;
using System.IO;
using BrazilianUtils.Bridge;

/// <summary>Replays the recorded tables against the generated C#.</summary>
public static class Conformance
{
    private const string Target = "csharp";

    /// <summary>One utility's score.</summary>
    private sealed class Tally
    {
        public int Passed { get; set; }

        public int Failed { get; set; }

        public int Skipped { get; set; }
    }

    /// <summary>Reads back the three characters the table format escapes.</summary>
    private static string Unescape(string value)
    {
        return value.Replace("\\\\t", "\\t").Replace("\\\\n", "\\n").Replace("\\\\\\\\", "\\\\");
    }

    /// <summary>Whether this target can express the call a row describes.</summary>
    private static bool Runs(string targets)
    {
        return targets == "*" || Array.IndexOf(targets.Split('|'), Target) >= 0;
    }

    /// <summary>Keeps a failure message readable when the answer is a five thousand row list.</summary>
    private static string Cut(string value)
    {
        return value.Length <= 120 ? value : value.Substring(0, 120);
    }

    /// <summary>Counts one comparison, and shows the first few that disagree.</summary>
    private static void Report(string fn, string actual, string expected, Tally counts)
    {
        if (actual == expected)
        {
            counts.Passed++;

            return;
        }

        counts.Failed++;

        if (counts.Failed <= 3)
        {
            Console.Error.WriteLine($"FAIL {fn} expected {Cut(expected)} got {Cut(actual)}");
        }
    }

${[...helpers.values()].join("\n\n")}

${checks.join("\n\n")}

    public static async System.Threading.Tasks.Task<int> Main(string[] args)
    {
        var failed = 0;
        Tally counts;

${plans
	.map(
		(plan) => `        counts = await Check${pascal(plan.entry.name)}();
        failed += counts.Failed;
        Console.WriteLine(
            $"{Target}: ${plan.entry.name} {counts.Passed}/{counts.Passed + counts.Failed} matched"
            + (counts.Skipped == 0 ? "" : $" ({counts.Skipped} not expressible)"));`,
	)
	.join("\n\n")}

        return failed == 0 ? 0 : 1;
    }
}
`;
};

/* --------------------------------------------------------------------- C ABI */

const cabi = (plans: Plan[]): string => {
	const exposed = plans.filter((plan) => plan.abi !== undefined);

	const checks = exposed.map((plan) => {
		const abi = plan.abi as Abi;
		const args = abi.args.map((argument) => {
			if (argument.k === "option") {
				const column = plan.opts.find((option) => option.name === argument.field) as OptPlan;
				const cell = `fields[${column.at}]`;
				const given = argument.ty.k === "bool" ? `strcmp(${cell}, "1") == 0` : `atoll(${cell})`;

				return `${cell}[0] == '\\0' ? ${argument.unset} : (${given})`;
			}

			const column = plan.args.find((arg) => arg.name === argument.param) as ArgPlan;

			return argument.k === "text"
				? `(const uint8_t *)fields[${column.at}], strlen(fields[${column.at}])`
				: `atoll(fields[${column.at}])`;
		});
		const body =
			abi.returns === "bool"
				? `        const char *actual = ${abi.symbol}(${args.join(", ")}) ? "true" : "false";`
				: `        uint8_t answer[512];
        intptr_t length = ${abi.symbol}(${args.join(", ")}, answer, sizeof answer - 1);

        if (length < 0 || (size_t)length >= sizeof answer) {
            length = 0;
        }

        answer[length] = '\\0';

        const char *actual = (const char *)answer;`;

		return `/* Replays what ${plan.entry.name} answers, over the C ABI. */
static struct tally check_${snake(plan.entry.name)}(void) {
    struct tally counts = {0, 0, 0};
    FILE *table = fopen("${tableOf(plan)}", "r");

    if (table == NULL) {
        perror("${tableOf(plan)}");
        exit(1);
    }

    char *line = malloc(MAX_LINE);
    char *fields[64];

    /* The header. */
    if (fgets(line, MAX_LINE, table) == NULL) {
        exit(1);
    }

    while (fgets(line, MAX_LINE, table) != NULL) {
        line[strcspn(line, "\\n")] = '\\0';

        if (line[0] == '\\0') {
            continue;
        }

        split(line, fields, 64);

        if (!runs(fields[0])) {
            counts.skipped++;

            continue;
        }

${plan.args.map((arg) => `        unescape(fields[${arg.at}]);`).join("\n")}
        unescape(fields[${plan.expect}]);

${body}

        report("${plan.entry.name}", actual, fields[${plan.expect}], &counts);
    }

    free(line);
    fclose(table);

    return counts;
}`;
	});

	return `/* Code generated by spec/bridge/conformance/drivers.ts. DO NOT EDIT.
 *
 * Replays the recorded tables over the C ABI the Rust crate exposes: the same surface a
 * hand-written binding in Python, Ruby, C#, Java or Erlang would call. Only the utilities the
 * ABI can carry appear here; the rest need a richer surface than pointers and integers.
 */
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

${exposed.map((plan) => `#include "include/${snake(plan.module.name)}.h"`).join("\n")}

#define MAX_LINE (1 << 20)

static const char *TARGET = "cabi";

struct tally {
    int passed;
    int failed;
    int skipped;
};

/* Reads back the three characters the table format escapes, in place. */
static void unescape(char *value) {
    char *write = value;

    for (const char *read = value; *read != '\\0'; read++) {
        if (*read != '\\\\' || read[1] == '\\0') {
            *write++ = *read;

            continue;
        }

        read++;
        *write++ = *read == 't' ? '\\t' : *read == 'n' ? '\\n' : *read;
    }

    *write = '\\0';
}

/* Splits a line on tabs, in place. */
static int split(char *line, char **fields, int max) {
    int count = 0;

    fields[count++] = line;

    for (char *cursor = line; *cursor != '\\0'; cursor++) {
        if (*cursor == '\\t' && count < max) {
            *cursor = '\\0';
            fields[count++] = cursor + 1;
        }
    }

    return count;
}

/* Whether this target can express the call a row describes. */
static int runs(const char *targets) {
    if (strcmp(targets, "*") == 0) {
        return 1;
    }

    const char *cursor = targets;
    size_t width = strlen(TARGET);

    while (cursor != NULL) {
        if (strncmp(cursor, TARGET, width) == 0 && (cursor[width] == '\\0' || cursor[width] == '|')) {
            return 1;
        }

        cursor = strchr(cursor, '|');

        if (cursor != NULL) {
            cursor++;
        }
    }

    return 0;
}

/* Counts one comparison, and shows the first few that disagree. */
static void report(const char *fn, const char *actual, const char *expected, struct tally *counts) {
    if (strcmp(actual, expected) == 0) {
        counts->passed++;

        return;
    }

    counts->failed++;

    if (counts->failed <= 3) {
        fprintf(stderr, "FAIL %s expected %.120s got %.120s\\n", fn, expected, actual);
    }
}

${checks.join("\n\n")}

int main(void) {
    int failed = 0;
    struct tally counts;

${exposed
	.map(
		(plan) => `    counts = check_${snake(plan.entry.name)}();
    failed += counts.failed;
    printf("%s: ${plan.entry.name} %d/%d matched", TARGET, counts.passed, counts.passed + counts.failed);

    if (counts.skipped > 0) {
        printf(" (%d not expressible)", counts.skipped);
    }

    printf("\\n");`,
	)
	.join("\n\n")}

    return failed == 0 ? 0 : 1;
}
`;
};

const recorders = await loadRecorders();
const modules = recorders.map((recorder) =>
	compileModule(resolve(bridge, "source", `${recorder.module}.ts`)),
);
const plans = modules.map((module) => planOf(module));

const files: Record<string, string> =
	plans.length === 0
		? {}
		: {
				"out/typescript/conformance.ts": typescript(plans),
				"out/python/conformance.py": python(plans),
				"out/ruby/conformance.rb": ruby(plans),
				"out/go/conformance/main.go": go(plans),
				"out/rust/src/bin/conformance.rs": rust(plans),
				"out/rust/conformance_cabi.c": cabi(plans),
				"out/java/Conformance.java": java(plans),
				"out/csharp/Conformance.cs": csharp(plans),
			};

for (const [path, contents] of Object.entries(files)) {
	const full = resolve(bridge, path);

	mkdirSync(dirname(full), { recursive: true });
	writeFileSync(full, contents);
}

console.log(`${Object.keys(files).length} drivers for ${plans.length} utilities`);
