#!/usr/bin/env node

/**
 * Writes the examples the document field page shows (`docs/examples/document-field.md`): one
 * focused example per document and framework, so a reader copies the CPF field, not a generic one
 * that has to be narrowed down first. Every file comes from a template in
 * `docs/snippets/document-field/_templates`, filled in from the table below, together with the
 * `mask` function they share. One page runs them all in the browser, `docs/snippets/live`, told
 * which files to compile by its query string. The Check workflow fails when these are stale.
 *
 * Usage:
 *   node scripts/examples.ts
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const EXAMPLE_DIR = join(ROOT, "docs", "snippets", "document-field");
const TEMPLATE_DIR = join(EXAMPLE_DIR, "_templates");

type Document = {
	/** The kebab-case name of the document, which names its folder and its files. */
	kind: string;
	/** The name in the code, `Cpf` in `CpfField`. */
	name: string;
	/** What the reader sees: the label of the field and of the tab. */
	label: string;
	/** The complete format, which also tells the field when the value is complete. */
	placeholder: string;
	/** The formatter of the package, and the arguments after the value, if any. */
	format: string;
	/** The validator of the package, and the arguments after the value, if any. */
	validator: string;
	/** The parser of the package, which takes the mask off, and its arguments after the value. */
	parser: string;
	/** What a browser may fill the field with, `off` when there is no token for the document. */
	autocomplete: string;
	/** The `inputmode` of the field: an alphanumeric CNPJ needs a keyboard with letters. */
	inputMode: "numeric" | "text";
};

const DOCUMENTS: Document[] = [
	{
		kind: "cpf",
		name: "Cpf",
		label: "CPF",
		placeholder: "000.000.000-00",
		format: "formatCpf",
		validator: "isValidCpf",
		parser: "parseCpf",
		autocomplete: "off",
		inputMode: "numeric",
	},
	{
		kind: "cnpj",
		name: "Cnpj",
		label: "CNPJ",
		placeholder: "00.ABC.000/0001-00",
		format: "formatCnpj, { version: 2 }",
		validator: "isValidCnpj, { version: 2 }",
		parser: "parseCnpj, { version: 2 }",
		autocomplete: "off",
		inputMode: "text",
	},
	{
		kind: "cep",
		name: "Cep",
		label: "CEP",
		placeholder: "00000-000",
		format: "formatCep",
		validator: "isValidCep",
		parser: "parseCep",
		autocomplete: "postal-code",
		inputMode: "numeric",
	},
	{
		kind: "phone",
		name: "Phone",
		label: "Phone",
		placeholder: "(00) 00000-0000",
		format: 'formatPhone, { mask: "nanp" }',
		validator: "isValidPhone",
		parser: "parsePhone",
		autocomplete: "tel-national",
		inputMode: "numeric",
	},
];

/** The schema libraries the schema tab shows, each a template of its own. */
const SCHEMAS = ["zod", "valibot", "arktype", "standard"] as const;

/**
 * The frameworks, each with the extension of its field and form files and the name its mask file
 * takes: a hook, a directive or a module, whatever that framework reaches for.
 */
const FRAMEWORKS = [
	{ name: "react", field: "tsx", form: "tsx", mask: "use-mask.ts" },
	{ name: "angular", field: "ts", form: "ts", mask: "mask.directive.ts" },
	{ name: "vue", field: "vue", form: "vue", mask: "mask.ts" },
] as const;

const PLACEHOLDER_PATTERN = /@@(\w+)@@/g;

/**
 * @param {string} source - A function and the arguments after the value, `formatCnpj, { version: 2 }`.
 * @returns {{ fn: string; rest: string }} The function on its own, and the remaining arguments.
 */
function split(source: string): { fn: string; rest: string } {
	const [fn = "", ...args] = source.split(", ");

	return { fn, rest: args.length === 0 ? "" : `, ${args.join(", ")}` };
}

/**
 * @param {{ fn: string; rest: string }} target - A function and its arguments after the value.
 * @param {string} value - What to pass as the value.
 * @returns {string} The call, `formatCnpj(value, { version: 2 })`.
 */
function call({ fn, rest }: { fn: string; rest: string }, value: string): string {
	return `${fn}(${value}${rest})`;
}

/**
 * @param {Document} document - The document the example is about.
 * @param {string} mask - The shared `mask` function, as TypeScript.
 * @returns {Record<string, string>} What every `@@name@@` of a template stands for.
 */
function values(document: Document, mask: string): Record<string, string> {
	const format = split(document.format);
	const validator = split(document.validator);
	const parser = split(document.parser);
	// A formatter that takes options is wrapped, so that the mask can call it with a value alone.
	const formatter = format.rest === "" ? format.fn : `(value: string) => ${call(format, "value")}`;

	return {
		kind: document.kind,
		Name: document.name,
		label: document.label,
		placeholder: document.placeholder,
		length: String(document.placeholder.length),
		inputMode: document.inputMode,
		autocomplete: document.autocomplete,
		names: [format.fn, validator.fn, parser.fn].join(", "),
		fieldImports: `import { ${[format.fn, parser.fn].join(", ")} } from "@brazilian-utils/brazilian-utils";`,
		imports: `import { ${[format.fn, validator.fn].join(", ")} } from "@brazilian-utils/brazilian-utils";`,
		formImports: `import { ${validator.fn} } from "@brazilian-utils/brazilian-utils";`,
		format: formatter,
		// The plain JavaScript example takes the same formatter without the type of its parameter.
		formatJs: formatter.replace("(value: string)", "(value)"),
		formatCall: call(format, "value"),
		formatValue: call(format, "value"),
		formatValueVue: call(format, "value.value"),
		formatSignal: call(format, "this.value()"),
		validator: call(validator, "value"),
		validatorPlain: call(validator, "value"),
		validatorValue: call(validator, "value.value"),
		validatorText: call(validator, "text.value"),
		validatorSignal: call(validator, "this.value()"),
		validatorControl: call(validator, "control.value"),
		validatorFn: validator.fn,
		// Inside a schema the validator is called on the value alone, wrapped when it takes options.
		validatorArrow:
			validator.rest === ""
				? validator.fn
				: `(${document.kind}) => ${call(validator, document.kind)}`,
		// Valibot's `check` takes a validator of `string` alone, so the call is always wrapped.
		validatorLambda: `(${document.kind}) => ${call(validator, document.kind)}`,
		validatorCtx: call(validator, document.kind),
		validatorOptions: validator.rest === "" ? "" : `\n  options:${validator.rest.slice(1)},`,
		parseInput: call(parser, "input.value"),
		parseMaskedVar: call(parser, "masked"),
		parseMaskedEvent: call(parser, "event.currentTarget.value"),
		parseMaskValue: call(parser, "maskValue(event)"),
		parseMaskedEventVue: call(parser, "(event.target as HTMLInputElement).value"),
		parseMaskedEventAngular: call(parser, "(event.target as HTMLInputElement).value"),
		mask,
		// `<script setup>` takes no ES module exports, so the Vue examples keep `mask` local.
		maskLocal: mask.replace("export function mask", "function mask"),
		maskJs: mask,
	};
}

/**
 * @param {string} name - A file of `docs/snippets/document-field/_templates`.
 * @returns {string} Its contents.
 */
function readTemplate(name: string): string {
	return readFileSync(join(TEMPLATE_DIR, name), "utf8");
}

/**
 * @param {string} template - The template, with `@@name@@` placeholders.
 * @param {Record<string, string>} substitutions - What each placeholder stands for.
 * @returns {string} The filled in template.
 */
function fill(template: string, substitutions: Record<string, string>): string {
	return template.replace(PLACEHOLDER_PATTERN, (match, name: string) => {
		const value = substitutions[name];

		if (value === undefined) throw new Error(`No value for ${match}`);

		return value;
	});
}

/**
 * @param {string} code - A block of code.
 * @param {number} spaces - How far to indent it.
 * @returns {string} The block, with every non-empty line indented.
 */
function indent(code: string, spaces: number): string {
	return code
		.split("\n")
		.map((line) => (line.trim() === "" ? line : " ".repeat(spaces) + line))
		.join("\n");
}

/**
 * @param {string} mask - The shared `mask` function, as TypeScript.
 * @returns {string} The same function without its types, for the plain JavaScript example.
 */
function toJavaScript(mask: string): string {
	// From the function's own doc comment: everything before it is the type of its parameter.
	const body = mask.slice(mask.indexOf("/**\n * Formats"));

	return body
		.replace(" * Returns the formatted value.\n", "")
		.replace(
			' */\nexport function mask({ input, inputType = "", format }: MaskParams): string {',
			[
				" * @param {{ input: HTMLInputElement, inputType?: string, format: (value: string) => string }} params",
				" * @returns {string} The formatted value.",
				" */",
				'function mask({ input, inputType = "", format }) {',
			].join("\n"),
		);
}

const maskTs = readFileSync(join(TEMPLATE_DIR, "_mask.ts"), "utf8").trim();
const maskJs = toJavaScript(maskTs);

rmSync(join(EXAMPLE_DIR, "generated"), { force: true, recursive: true });

for (const document of DOCUMENTS) {
	const folder = join(EXAMPLE_DIR, "generated", document.kind);

	mkdirSync(folder, { recursive: true });

	for (const framework of FRAMEWORKS) {
		// A folder per framework: a reader copies one, and two of them name a file the same way.
		const frameworkFolder = join(folder, framework.name);

		mkdirSync(frameworkFolder, { recursive: true });

		writeFileSync(
			join(frameworkFolder, framework.mask),
			fill(readTemplate(`mask-${framework.name}.ts`), {
				...values(document, maskTs),
				maskJsModule: maskJs,
			}),
		);

		for (const [part, extension] of [
			["field", framework.field],
			["form", framework.form],
		] as const) {
			const template = readFileSync(
				join(TEMPLATE_DIR, `${framework.name}-${part}.${extension}`),
				"utf8",
			);
			const file = `${document.kind}-${part}.${extension}`;

			writeFileSync(
				join(frameworkFolder, file),
				fill(template, { ...values(document, maskTs), maskJs }),
			);
		}
	}

	mkdirSync(join(folder, "schema"), { recursive: true });

	for (const schema of SCHEMAS) {
		const template = readFileSync(join(TEMPLATE_DIR, `schema-${schema}.ts`), "utf8");

		writeFileSync(
			join(folder, "schema", `${document.kind}-${schema}.ts`),
			fill(template, values(document, maskTs)),
		);
	}

	mkdirSync(join(folder, "vanilla"), { recursive: true });

	writeFileSync(
		join(folder, "vanilla", "mask.js"),
		fill(readTemplate("mask-vanilla.js"), {
			...values(document, maskTs),
			maskJsModule: maskJs.replace("function mask(", "export function mask("),
		}),
	);

	const vanilla = readFileSync(join(TEMPLATE_DIR, "vanilla.html"), "utf8");

	writeFileSync(
		join(folder, "vanilla", `${document.kind}-field.html`),
		fill(vanilla, { ...values(document, maskTs), maskJs: indent(maskJs, 2) }),
	);
}

// A page that points at a file which is not there renders whatever the server answers with, so
// the pages that show these examples are checked against what was just written.
const PAGES = [
	join(ROOT, "docs", "examples", "document-field.md"),
	join(ROOT, "docs", "pt-br", "examples", "document-field.md"),
];
const INCLUDE_PATTERN = /\]\((\.[^ )]+) ':include/g;

for (const page of PAGES) {
	const folder = join(page, "..");

	for (const [, target] of readFileSync(page, "utf8").matchAll(INCLUDE_PATTERN)) {
		const file = join(folder, target ?? "");

		if (!existsSync(file)) throw new Error(`${page} includes ${target}, which is not there`);
	}
}

console.log(`Wrote ${DOCUMENTS.length} documents × ${FRAMEWORKS.length + 1} frameworks`);
